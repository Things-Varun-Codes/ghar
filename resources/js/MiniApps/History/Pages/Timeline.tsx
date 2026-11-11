import { router, usePage } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { captureSilent } from '@/lib/observability';
import type { EventPermissions } from '@/MiniApps/History/Components/CalendarMonth';
import EventCard from '@/MiniApps/History/Components/EventCard';
import EventSheet from '@/MiniApps/History/Components/EventSheet';
import type { MediaItem } from '@/MiniApps/History/Components/MediaGrid';
import SortDropdown from '@/MiniApps/History/Components/SortDropdown';
import YearBanner from '@/MiniApps/History/Components/YearBanner';
import YearJumpRail from '@/MiniApps/History/Components/YearJumpRail';
import { useConversionPolling } from '@/MiniApps/History/Hooks/useConversionPolling';
import HistoryLayout from '@/MiniApps/History/Layouts/HistoryLayout';
import { timeline } from '@/routes/apps/our-history';
import EmptyState from '@/Shell/Components/EmptyState';
import Fab from '@/Shell/Components/Fab';
import AppLayout from '@/Shell/Layouts/AppLayout';
import type { Auth } from '@/types/auth';

type Change = {
    id: number;
    action: string;
    summary: string;
    user_name: string;
    created_at: string;
};

type HistoryEvent = {
    id: number;
    date: string;
    date_label: string;
    year: number;
    title: string | null;
    location_freetext: string | null;
    location_place_id: string | null;
    location_name: string | null;
    location_address: string | null;
    location_lat: number | null;
    location_lng: number | null;
    body_html: string | null;
    body_markdown: string | null;
    created_at: string;
    updated_at: string;
    media: MediaItem[];
    changes: Change[];
    can: EventPermissions;
};

type PaginatedEvents = {
    data: HistoryEvent[];
    next_page_url: string | null;
    next_cursor: string | null;
    prev_cursor: string | null;
};

type SortOrder = 'newest-first' | 'oldest-first';

type Props = {
    events: PaginatedEvents;
    order: SortOrder;
    eventsCount: number;
    lastEventOccurredOn: string | null;
    yearCounts: Record<number, number>;
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
}: Props) {
    const daysSinceLast = lastEventOccurredOn
        ? daysSinceDate(lastEventOccurredOn, new Date())
        : null;

    const countLine = buildHistoryLine(eventsCount, daysSinceLast);
    const { auth } = usePage<{ auth: Auth }>().props;
    const userRole: 'admin' | 'user' | 'guest' = auth.user
        ? auth.user.roles?.[0] === 'admin'
            ? 'admin'
            : 'user'
        : 'guest';
    const userRoleRef = useRef(userRole);
    useEffect(() => {
        userRoleRef.current = userRole;
    }, [userRole]);

    const [sheetOpen, setSheetOpen] = useState(false);
    const [sheetMode, setSheetMode] = useState<'add' | 'edit' | 'read'>('add');
    const [editingEvent, setEditingEvent] = useState<HistoryEvent | null>(null);

    const lastTriggerRef = useRef<HTMLElement | null>(null);

    const [accumulatedEvents, setAccumulatedEvents] = useState<HistoryEvent[]>(
        initialEvents.data,
    );
    const [paginatorMeta, setPaginatorMeta] = useState({
        next_page_url: initialEvents.next_page_url,
    });
    const [loadingMore, setLoadingMore] = useState(false);
    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- re-seeds accumulated pages from fresh Inertia props
        setAccumulatedEvents(initialEvents.data);
        setPaginatorMeta({
            next_page_url: initialEvents.next_page_url,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the query: keying on the data would reset on every appended page
    }, [order, eventsCount]);

    useEffect(() => {
        const sentinel = sentinelRef.current;

        if (!sentinel) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];

                if (
                    entry.isIntersecting &&
                    paginatorMeta.next_page_url &&
                    !loadingMore
                ) {
                    setLoadingMore(true);
                    router.get(
                        paginatorMeta.next_page_url,
                        {},
                        {
                            preserveScroll: true,
                            preserveState: true,
                            // A cursor URL in the address bar would make a hard refresh load only
                            // the after-cursor slice.
                            preserveUrl: true,
                            only: ['events'],
                            onSuccess: (page) => {
                                const newEvents = page.props
                                    .events as PaginatedEvents;
                                setAccumulatedEvents((prev) => [
                                    ...prev,
                                    ...newEvents.data,
                                ]);
                                setPaginatorMeta({
                                    next_page_url: newEvents.next_page_url,
                                });
                                setLoadingMore(false);
                            },
                            onError: (errors) => {
                                captureSilent(
                                    new Error(
                                        'event.timeline-load-more failed',
                                    ),
                                    {
                                        component: 'History/Timeline',
                                        action: 'event.timeline-load-more',
                                        surface: 'frontend',
                                        user_role: userRoleRef.current,
                                        extra: {
                                            payload: {
                                                next_page_url:
                                                    paginatorMeta.next_page_url,
                                                errors,
                                            },
                                        },
                                    },
                                );
                                setLoadingMore(false);
                            },
                        },
                    );
                }
            },
            { rootMargin: '200px' },
        );

        observer.observe(sentinel);

        return () => observer.disconnect();
    }, [paginatorMeta.next_page_url, loadingMore]);

    const hasPendingMedia = accumulatedEvents.some((e) =>
        e.media.some((m) => m.pending),
    );
    useConversionPolling(hasPendingMedia, () => {
        router.reload({
            only: ['events'],
            onSuccess: (page) => {
                const fresh = (page.props.events as PaginatedEvents).data;
                const byId = new Map(fresh.map((e) => [e.id, e]));
                setAccumulatedEvents((prev) =>
                    prev.map((e) => byId.get(e.id) ?? e),
                );
            },
        });
    });

    const yearGroups = useMemo(
        () => groupByYear(accumulatedEvents, order),
        [accumulatedEvents, order],
    );
    const distinctYears = useMemo(
        () => yearGroups.map((g) => g.year),
        [yearGroups],
    );

    const isEmpty = accumulatedEvents.length === 0;

    return (
        <AppLayout>
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
                    icon={
                        <Plus aria-hidden="true" size={24} strokeWidth={2.5} />
                    }
                    onClick={() => {
                        lastTriggerRef.current =
                            document.activeElement as HTMLElement | null;
                        setEditingEvent(null);
                        setSheetMode('add');
                        setSheetOpen(true);
                    }}
                />

                {isEmpty && (
                    <EmptyState
                        title="The family album is empty."
                        body="Add your first moment. Any date will do, and you can always go back further."
                        action={
                            <button
                                type="button"
                                onClick={() => {
                                    lastTriggerRef.current =
                                        document.activeElement as HTMLElement | null;
                                    setEditingEvent(null);
                                    setSheetMode('add');
                                    setSheetOpen(true);
                                }}
                                className="history-btn-add-first"
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
                                    count={
                                        yearCounts[year] ?? yearEvents.length
                                    }
                                />
                                {yearEvents.map((event) => (
                                    <div key={event.id} className="relative">
                                        <EventCard
                                            event={event}
                                            onRead={(id) => {
                                                lastTriggerRef.current =
                                                    document.activeElement as HTMLElement | null;
                                                const target =
                                                    accumulatedEvents.find(
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

                        {loadingMore && (
                            <div className="pb-4">
                                {[1, 2, 3].map((i) => (
                                    <Skeleton
                                        key={i}
                                        className="history-skeleton-block"
                                    />
                                ))}
                            </div>
                        )}

                        <div ref={sentinelRef} className="h-[1px]" />
                    </div>
                )}

                <EventSheet
                    open={sheetOpen}
                    onOpenChange={setSheetOpen}
                    mode={sheetMode}
                    editingEvent={editingEvent}
                    triggerRef={lastTriggerRef}
                />
            </HistoryLayout>
        </AppLayout>
    );
}
