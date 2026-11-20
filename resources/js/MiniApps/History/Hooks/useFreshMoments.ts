import { useMemo, useState } from 'react';
import type { HistoryEvent } from '@/MiniApps/History/lib/types';

type Patch = Pick<HistoryEvent, 'reactions' | 'comments'> & {
    /* The copies the fresh moment was newer than; a copy the server sends later is newer still. */
    stale: HistoryEvent[];
};

export type MomentPatches = ReadonlyMap<number, Patch>;

/*
 * Reacting and commenting answer with only the fresh `moment`, so a page's own copies of it
 * (a Timeline row, an "On this day" card) keep the old counts until the next full response.
 * Each copy seen when a fresh moment arrives is patched from it; a copy that comes later from
 * the server replaces it and wins.
 */
export function recordMoment(
    patches: MomentPatches,
    moment: HistoryEvent,
    lists: HistoryEvent[][],
): MomentPatches {
    const stale = [...(patches.get(moment.id)?.stale ?? [])];

    for (const list of lists) {
        for (const event of list) {
            if (
                event.id === moment.id &&
                event !== moment &&
                !stale.includes(event)
            ) {
                stale.push(event);
            }
        }
    }

    const next = new Map(patches);
    next.set(moment.id, {
        reactions: moment.reactions,
        comments: moment.comments,
        stale,
    });

    return next;
}

export function applyPatches(
    list: HistoryEvent[],
    patches: MomentPatches,
): HistoryEvent[] {
    if (patches.size === 0) {
        return list;
    }

    let changed = false;
    const patched = list.map((event) => {
        const patch = patches.get(event.id);

        if (!patch || !patch.stale.includes(event)) {
            return event;
        }

        changed = true;

        return {
            ...event,
            reactions: patch.reactions,
            comments: patch.comments,
        };
    });

    return changed ? patched : list;
}

/*
 * The open moment, read from what the page holds now: its row, else the server's `moment`
 * (which reaches past the loaded rows), else another copy on the page.
 */
export function findMoment(
    id: number | null,
    rows: HistoryEvent[],
    others: HistoryEvent[],
    moment: HistoryEvent | null | undefined,
): HistoryEvent | null {
    if (id === null) {
        return null;
    }

    return (
        rows.find((e) => e.id === id) ??
        (moment?.id === id ? moment : undefined) ??
        others.find((e) => e.id === id) ??
        null
    );
}

/* `rows` and `others` with every copy of a moment brought up to its freshest `moment` prop. */
export function useFreshMoments(
    moment: HistoryEvent | null | undefined,
    rows: HistoryEvent[],
    others: HistoryEvent[],
): { rows: HistoryEvent[]; others: HistoryEvent[] } {
    const current = moment ?? null;
    const [seen, setSeen] = useState<{
        moment: HistoryEvent | null;
        patches: MomentPatches;
    }>({ moment: current, patches: new Map() });

    let patches = seen.patches;

    if (current !== seen.moment) {
        patches = current
            ? recordMoment(seen.patches, current, [rows, others])
            : seen.patches;
        setSeen({ moment: current, patches });
    }

    const patchedRows = useMemo(
        () => applyPatches(rows, patches),
        [rows, patches],
    );
    const patchedOthers = useMemo(
        () => applyPatches(others, patches),
        [others, patches],
    );

    return { rows: patchedRows, others: patchedOthers };
}
