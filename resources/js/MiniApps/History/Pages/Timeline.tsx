import { usePage } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Settle, SettleItem } from '@/components/motion';
import { region } from '@/lib/dates';
import { scrollBehavior } from '@/lib/motion';
import EventCard from '@/MiniApps/History/Components/EventCard';
import EventSheet from '@/MiniApps/History/Components/EventSheet';
import OnThisDayStrip from '@/MiniApps/History/Components/OnThisDayStrip';
import SortDropdown from '@/MiniApps/History/Components/SortDropdown';
import YearBanner from '@/MiniApps/History/Components/YearBanner';
import YearJumpRail from '@/MiniApps/History/Components/YearJumpRail';
import { useConversionPolling } from '@/MiniApps/History/Hooks/useConversionPolling';
import {
    findMoment,
    useFreshMoments,
} from '@/MiniApps/History/Hooks/useFreshMoments';
import { useMomentFromUrl } from '@/MiniApps/History/Hooks/useMomentFromUrl';
import HistoryLayout from '@/MiniApps/History/Layouts/HistoryLayout';
import type {
    HistoryEvent,
    MemberBirthday,
} from '@/MiniApps/History/lib/types';
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
    /* Moments from today's date in earlier years, newest first. */
    onThisDay: HistoryEvent[];
    birthdays: MemberBirthday[];
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
    return NUMBER_WORDS[n] ?? n.toLocaleString(region().locale);
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

/* Whole days between two YYYY-MM-DD dates, counted in UTC so no clock change shortens one. */
function daysBetween(from: string, to: string): number {
    const day = (iso: string) => {
        const [y, m, d] = iso.slice(0, 10).split('-').map(Number);

        return Date.UTC(y, m - 1, d);
    };

    return Math.round((day(to) - day(from)) / 86_400_000);
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
    onThisDay,
    birthdays,
    moment,
}: Props) {
    // The household's today, not this device's.
    const { today } = usePage().props;
    const daysSinceLast = lastEventOccurredOn
        ? daysBetween(lastEventOccurredOn, today)
        : null;

    const countLine = buildHistoryLine(eventsCount, daysSinceLast);

    const [sheetOpen, setSheetOpen] = useState(false);
    const [sheetMode, setSheetMode] = useState<'add' | 'edit' | 'read'>('add');
    // The id, not a copy: the sheet reads the moment from the current props, so a reaction or
    // a comment shows as soon as the fresh moment comes back. The copy is for while it closes.
    const [openId, setOpenId] = useState<number | null>(null);
    const [openedCopy, setOpenedCopy] = useState<HistoryEvent | null>(null);

    const openMoment = (event: HistoryEvent | null) => {
        setOpenId(event?.id ?? null);
        setOpenedCopy(event);
        setSheetMode(event ? 'read' : 'add');
        setSheetOpen(true);
    };

    useMomentFromUrl(moment, [...initialEvents.data, ...onThisDay], openMoment);

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

    const fresh = useFreshMoments(moment, loadedEvents, onThisDay);
    const openEvent =
        findMoment(openId, fresh.rows, fresh.others, moment) ?? openedCopy;

    const hasPendingMedia = loadedEvents.some((e) =>
        e.media.some((m) => m.pending),
    );
    useConversionPolling(hasPendingMedia, refreshInPlace);

    const yearGroups = useMemo(
        () => groupByYear(fresh.rows, order),
        [fresh.rows, order],
    );
    const rowIndex = useMemo(
        () =>
            new Map(
                yearGroups
                    .flatMap((g) => g.events)
                    .map((e, i) => [e.id, i] as const),
            ),
        [yearGroups],
    );
    const distinctYears = useMemo(
        () => yearGroups.map((g) => g.year),
        [yearGroups],
    );
    // Every year with moments, not only the loaded ones, in the timeline's order.
    const allYears = useMemo(
        () =>
            Object.entries(yearCounts)
                .map(([year, n]) => ({ year: Number(year), count: n }))
                .sort((a, b) =>
                    order === 'oldest-first'
                        ? a.year - b.year
                        : b.year - a.year,
                ),
        [yearCounts, order],
    );

    // A year further down may not have loaded yet, or not enough below it for it to reach the
    // top: keep the load-more sentinel in view, which loads the next page, until it has, then
    // scroll to it.
    const jumpTo = useRef<number | null>(null);

    const stepJump = useCallback(() => {
        if (jumpTo.current === null) {
            return;
        }

        const section = document.getElementById(`year-${jumpTo.current}`);
        const allLoaded = loadedEvents.length >= eventsCount;
        const roomBelow =
            section !== null &&
            document.documentElement.scrollHeight -
                (section.getBoundingClientRect().top + window.scrollY) >=
                window.innerHeight;

        // A failed load still goes to the year if it has arrived, as far as the page allows.
        if (section && (roomBelow || allLoaded || loadError)) {
            jumpTo.current = null;
            section.scrollIntoView({
                behavior: scrollBehavior(),
                block: 'start',
            });
            // Focus follows the jump, to that year's heading, without undoing the scroll. A beat
            // later, so the closing menu has let go of focus first.
            window.setTimeout(() =>
                section
                    .querySelector<HTMLElement>('.history-year-jump')
                    ?.focus({ preventScroll: true }),
            );
        } else if (loadError) {
            jumpTo.current = null;
        } else if (!loadingMore) {
            sentinelRef.current?.scrollIntoView({ block: 'end' });
        }
    }, [loadingMore, loadError, sentinelRef, loadedEvents.length, eventsCount]);

    // Each page that arrives is another look for the year.
    useEffect(stepJump, [stepJump]);

    const jumpToYear = (year: number) => {
        jumpTo.current = year;
        stepJump();
    };

    const isEmpty = loadedEvents.length === 0;

    return (
        <HistoryLayout
            activeTab="timeline"
            count={
                <span className="font-sans text-(length:--text-body) text-(--history-ink-soft)">
                    {countLine}
                </span>
            }
            controls={
                <SortDropdown currentOrder={order} basePath={timeline.url()} />
            }
        >
            <YearJumpRail years={distinctYears} />

            <Fab
                ariaLabel="Add moment"
                icon={<Plus aria-hidden="true" size={24} strokeWidth={2.5} />}
                onClick={() => openMoment(null)}
            />

            {/* In the card column, clear of the fixed year rail. */}
            <div className="history-timeline-body">
                <OnThisDayStrip events={fresh.others} onOpen={openMoment} />
            </div>

            {isEmpty && (
                <EmptyState
                    title="Nothing on the timeline yet."
                    body="Add your first moment. It can be from any date, even years back."
                    action={
                        <button
                            type="button"
                            onClick={() => openMoment(null)}
                            className="history-btn-add-first shell-press"
                        >
                            Add your first moment
                        </button>
                    }
                />
            )}

            {!isEmpty && (
                <div className="timeline history-timeline-wrapper history-timeline-body relative m-0">
                    <div
                        aria-hidden="true"
                        className="history-timeline-rail history-rail-line"
                    />

                    {/* Only the first page settles in; rows loaded later appear in place. */}
                    <Settle>
                        {yearGroups.map(({ year, events: yearEvents }) => (
                            // The anchor is the year's section, not its pinned heading: once
                            // scrolled past, the heading sits at the section's end.
                            <div key={year} id={`year-${year}`}>
                                <YearBanner
                                    year={year}
                                    count={
                                        yearCounts[year] ?? yearEvents.length
                                    }
                                    years={allYears}
                                    onJump={jumpToYear}
                                />
                                {yearEvents.map((event) => (
                                    <SettleItem
                                        key={event.id}
                                        index={rowIndex.get(event.id) ?? 0}
                                        className="relative"
                                    >
                                        <EventCard
                                            event={event}
                                            onRead={(id) =>
                                                openMoment(
                                                    fresh.rows.find(
                                                        (e) => e.id === id,
                                                    ) ?? null,
                                                )
                                            }
                                        />
                                    </SettleItem>
                                ))}
                            </div>
                        ))}
                    </Settle>

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
                editingEvent={sheetMode === 'add' ? null : openEvent}
                birthdays={birthdays}
            />
        </HistoryLayout>
    );
}
