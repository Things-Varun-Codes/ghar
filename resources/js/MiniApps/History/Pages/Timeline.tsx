import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import EventCard from '@/MiniApps/History/Components/EventCard';
import EventSheet from '@/MiniApps/History/Components/EventSheet';
import SortDropdown from '@/MiniApps/History/Components/SortDropdown';
import YearBanner from '@/MiniApps/History/Components/YearBanner';
import YearJumpRail from '@/MiniApps/History/Components/YearJumpRail';
import { useConversionPolling } from '@/MiniApps/History/Hooks/useConversionPolling';
import { useMomentFromUrl } from '@/MiniApps/History/Hooks/useMomentFromUrl';
import HistoryLayout from '@/MiniApps/History/Layouts/HistoryLayout';
import type { HistoryEvent } from '@/MiniApps/History/lib/types';
import { timeline } from '@/routes/apps/our-history';
import EmptyState from '@/Shell/Components/EmptyState';
import Fab from '@/Shell/Components/Fab';
import ListLoadMoreState from '@/Shell/Components/ListLoadMoreState';
import { useCursorPagination } from '@/Shell/Hooks/useCursorPagination';
import type { CursorPaginator } from '@/Shell/Hooks/useCursorPagination';

type SortOrder = 'newest-first' | 'oldest-first';

type Props = {
    events: CursorPaginator<HistoryEvent>;
    order: SortOrder;
    eventsCount: number;
    lastEventOccurredOn: string | null;
    yearCounts: Record<number, number>;
    moment?: HistoryEvent | null;
};

const NUMBER_WORDS: Record<number, string> = {
    0: 'Zero',
    1: 'One',
    2: 'Two',
    3: 'Three',
    4: 'Four',
    5: 'Five',
    6: 'Six',
    7: 'Seven',
    8: 'Eight',
    9: 'Nine',
    10: 'Ten',
    11: 'Eleven',
    12: 'Twelve',
};

function spellOut(n: number): string {
    return NUMBER_WORDS[n] ?? n.toLocaleString('en-US');
}

function buildHistoryLine(count: number, days: number | null): string {
    if (count === 0) {
        return 'No moments yet.';
    }

    const moments = `${spellOut(count)} ${count === 1 ? 'moment' : 'moments'} so far.`;

    if (days === null) {
        return moments;
    }

    if (days <= 0) {
        return `${moments} Last one was today.`;
    }

    if (days === 1) {
        return `${moments} One day since the last.`;
    }

    return `${moments} ${spellOut(days)} days since the last.`;
}

function daysSinceDate(isoDate: string, now: Date): number {
    const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number);
    const last = new Date(y, m - 1, d).getTime();
    const today = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
    ).getTime();

    return Math.round((today - last) / 86_400_000);
}

type YearGroup = {
    year: number;
    events: HistoryEvent[];
};

function groupByYear(events: HistoryEvent[], order: SortOrder): YearGroup[] {
    const map = new Map<number, HistoryEvent[]>();

    for (const event of events) {
        const arr = map.get(event.year) ?? [];
        arr.push(event);
        map.set(event.year, arr);
    }

    return Array.from(map.entries())
        .sort(([a], [b]) => (order === 'oldest-first' ? a - b : b - a))
        .map(([year, evts]) => ({ year, events: evts }));
}

export default function Timeline({
    events: initialEvents,
    order,
    eventsCount,
    lastEventOccurredOn,
    yearCounts,
    moment,
}: Props) {
    const daysSinceLast = lastEventOccurredOn
        ? daysSinceDate(lastEventOccurredOn, new Date())
        : null;

    const countLine = buildHistoryLine(eventsCount, daysSinceLast);

    const [sheetOpen, setSheetOpen] = useState(false);
    const [sheetMode, setSheetMode] = useState<'add' | 'edit' | 'read'>('add');
    const [editingEvent, setEditingEvent] = useState<HistoryEvent | null>(null);

    useMomentFromUrl(moment, initialEvents.data, (event) => {
        setEditingEvent(event);
        setSheetMode('read');
        setSheetOpen(true);
    });

    const {
        items: loadedEvents,
        sentinelRef,
        loadingMore,
        loadError,
        retryLoadMore,
        refreshInPlace,
    } = useCursorPagination<HistoryEvent>({
        initial: initialEvents,
        propName: 'events',
    });

    const hasPendingMedia = loadedEvents.some((e) =>
        e.media.some((m) => m.pending),
    );
    useConversionPolling(hasPendingMedia, refreshInPlace);

    const yearGroups = useMemo(
        () => groupByYear(loadedEvents, order),
        [loadedEvents, order],
    );
    const distinctYears = useMemo(
        () => yearGroups.map((g) => g.year),
        [yearGroups],
    );

    const isEmpty = loadedEvents.length === 0;

    return (
        <HistoryLayout
            activeTab="timeline"
            count={
                <span className="font-sans text-(length:--text-eyebrow) text-(--history-ink-soft)">
                    {countLine}
                </span>
            }
            controls={
                <div className="history-sort-toolbar">
                    <SortDropdown
                        currentOrder={order}
                        basePath={timeline.url()}
                    />
                </div>
            }
        >
            <YearJumpRail years={distinctYears} />

            <Fab
                ariaLabel="Add moment"
                icon={<Plus aria-hidden="true" size={24} strokeWidth={2.5} />}
                onClick={() => {
                    setEditingEvent(null);
                    setSheetMode('add');
                    setSheetOpen(true);
                }}
            />

            {isEmpty && (
                <EmptyState
                    title="Nothing on the timeline yet."
                    body="Add your first moment. It can be from any date, even years back."
                    action={
                        <button
                            type="button"
                            onClick={() => {
                                setEditingEvent(null);
                                setSheetMode('add');
                                setSheetOpen(true);
                            }}
                            className="history-btn-add-first shell-press"
                        >
                            Add your first moment
                        </button>
                    }
                />
            )}

            {!isEmpty && (
                <div className="timeline history-timeline-wrapper history-timeline-body relative m-0">
                    <div className="history-sort-sticky">
                        <SortDropdown
                            currentOrder={order}
                            basePath={timeline.url()}
                        />
                    </div>

                    <div
                        aria-hidden="true"
                        className="history-timeline-rail history-rail-line"
                    />

                    {yearGroups.map(({ year, events: yearEvents }) => (
                        <div key={year}>
                            <YearBanner
                                year={year}
                                count={yearCounts[year] ?? yearEvents.length}
                            />
                            {yearEvents.map((event) => (
                                <div key={event.id} className="relative">
                                    <EventCard
                                        event={event}
                                        onRead={(id) => {
                                            const target =
                                                loadedEvents.find(
                                                    (e) => e.id === id,
                                                ) ?? null;
                                            setEditingEvent(target);
                                            setSheetMode('read');
                                            setSheetOpen(true);
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    ))}

                    <ListLoadMoreState
                        loadingMore={loadingMore}
                        loadError={loadError}
                        onRetry={retryLoadMore}
                        sentinelRef={sentinelRef}
                    />
                </div>
            )}

            <EventSheet
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                mode={sheetMode}
                editingEvent={editingEvent}
            />
        </HistoryLayout>
    );
}
