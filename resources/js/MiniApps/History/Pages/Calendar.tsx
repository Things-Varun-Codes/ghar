import { router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import CalendarMonth from '@/MiniApps/History/Components/CalendarMonth';
import type { CalendarEvent } from '@/MiniApps/History/Components/CalendarMonth';
import EventSheet from '@/MiniApps/History/Components/EventSheet';
import HistoryLayout from '@/MiniApps/History/Layouts/HistoryLayout';
import { calendar } from '@/routes/apps/our-history';
import EmptyState from '@/Shell/Components/EmptyState';
import AppLayout from '@/Shell/Layouts/AppLayout';

const MONTH_ABBR = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
];

type Props = {
    events: CalendarEvent[];
    onThisDay: CalendarEvent[];
    year: number;
    availableYears: number[];
    eventsCount: number;
};

/** Bucket events into month → day → events[], parsing the 'YYYY-MM-DD' string
 *  by splitting on '-' (never new Date(str) — UTC-parse off-by-one for users ahead of UTC). */
function buildMonthMaps(
    events: CalendarEvent[],
): Map<number, Map<number, CalendarEvent[]>> {
    const byMonth = new Map<number, Map<number, CalendarEvent[]>>();

    for (const e of events) {
        const parts = e.date.split('-');
        const month = Number(parts[1]);
        const day = Number(parts[2]);

        if (!byMonth.has(month)) {
            byMonth.set(month, new Map());
        }

        const dayMap = byMonth.get(month)!;

        if (!dayMap.has(day)) {
            dayMap.set(day, []);
        }

        dayMap.get(day)!.push(e);
    }

    return byMonth;
}

const EMPTY_DAY_MAP = new Map<number, CalendarEvent[]>();

export default function Calendar({
    events,
    onThisDay,
    year,
    availableYears,
}: Props) {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const mql = window.matchMedia('(max-width: 719px)');
        const apply = () => setIsMobile(mql.matches);
        apply();
        mql.addEventListener('change', apply);

        return () => mql.removeEventListener('change', apply);
    }, []);

    const lastTriggerRef = useRef<HTMLElement | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
        null,
    );
    // The menu row unmounts on close, so multi-event days return focus to the day cell passed in
    // here.
    const openEvent = (
        event: CalendarEvent,
        triggerEl?: HTMLElement | null,
    ) => {
        lastTriggerRef.current =
            triggerEl !== undefined
                ? triggerEl
                : (document.activeElement as HTMLElement | null);
        setSelectedEvent(event);
        setSheetOpen(true);
    };

    const byMonth = useMemo(() => buildMonthMaps(events), [events]);

    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth() + 1;
    const todayDay = now.getDate();

    const todayMonthDay =
        todayYear === year ? { month: todayMonth, day: todayDay } : null;

    const monthsWithEvents = Array.from(byMonth.keys()).sort((a, b) => b - a);
    const defaultMonth =
        monthsWithEvents.length > 0
            ? monthsWithEvents[0]
            : todayYear === year
              ? todayMonth
              : 1;

    const [selMonth, setSelMonth] = useState(defaultMonth);

    const [trackedYear, setTrackedYear] = useState(year);

    if (trackedYear !== year) {
        setTrackedYear(year);
        setSelMonth(defaultMonth);
    }

    const selChipRef = useRef<HTMLButtonElement | null>(null);
    useEffect(() => {
        selChipRef.current?.scrollIntoView({
            inline: 'center',
            block: 'nearest',
        });
    }, [selMonth, isMobile]);

    const minYear = availableYears.length ? Math.min(...availableYears) : year;
    const prevDisabled = year <= minYear;
    const nextDisabled = year >= todayYear;
    const goYear = (y: number) =>
        router.get(
            calendar.url({ query: { year: y } }),
            {},
            { preserveScroll: true, preserveState: false },
        );

    const hasAnyEvents = availableYears.length > 0;
    const yearIsEmpty = events.length === 0;

    const momentCount =
        events.length > 0
            ? `${events.length} ${events.length === 1 ? 'moment' : 'moments'}`
            : '';

    return (
        <AppLayout>
            <HistoryLayout
                activeTab="calendar"
                count={
                    <span className="font-sans text-(length:--text-eyebrow) text-(--history-ink-soft)">
                        {momentCount}
                    </span>
                }
                controls={
                    <div className="history-cal-yearnav">
                        <button
                            type="button"
                            className="history-cal-navbtn"
                            onClick={() => goYear(year - 1)}
                            disabled={prevDisabled}
                            aria-label="Previous year"
                        >
                            <ChevronLeft size={18} aria-hidden="true" />
                        </button>
                        <span className="history-cal-year-label">{year}</span>
                        <button
                            type="button"
                            className="history-cal-navbtn"
                            onClick={() => goYear(year + 1)}
                            disabled={nextDisabled}
                            aria-label="Next year"
                        >
                            <ChevronRight size={18} aria-hidden="true" />
                        </button>
                    </div>
                }
            >
                {onThisDay.length > 0 && (
                    <div className="history-cal-otd">
                        <div className="history-cal-otd-head">
                            <span
                                className="history-cal-otd-dot"
                                aria-hidden="true"
                            />
                            On this day · {MONTH_ABBR[now.getMonth()]}{' '}
                            {now.getDate()}
                        </div>
                        <div className="history-cal-otd-row">
                            {onThisDay.map((e) => {
                                const ago = todayYear - e.year;
                                const agoText =
                                    ago <= 0
                                        ? 'today'
                                        : ago === 1
                                          ? '1 year ago'
                                          : `${ago} years ago`;
                                const thumb =
                                    e.media.find((m) => m.thumb || m.poster)
                                        ?.thumb ?? null;

                                return (
                                    <button
                                        key={e.id}
                                        type="button"
                                        className="history-cal-otd-card"
                                        onClick={() => openEvent(e)}
                                    >
                                        <span
                                            className="history-cal-otd-thumb"
                                            style={
                                                thumb
                                                    ? {
                                                          backgroundImage: `url("${thumb}")`,
                                                      }
                                                    : undefined
                                            }
                                            aria-hidden="true"
                                        />
                                        <span className="history-cal-otd-text">
                                            <span className="history-cal-otd-year">
                                                {e.year}
                                            </span>
                                            <span className="history-cal-otd-title">
                                                {e.title ?? e.date_label}
                                            </span>
                                            <span className="history-cal-otd-sub">
                                                {agoText}
                                                {e.location_name
                                                    ? ` · ${e.location_name}`
                                                    : ''}
                                            </span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {yearIsEmpty ? (
                    <EmptyState
                        title={
                            hasAnyEvents
                                ? `Nothing from ${year} yet`
                                : 'No moments yet'
                        }
                        body={
                            hasAnyEvents
                                ? 'Use the year arrows to find a year with moments.'
                                : 'Add moments from the Timeline and they’ll appear here on the calendar.'
                        }
                    />
                ) : isMobile ? (
                    <>
                        <div
                            className="history-cal-picker"
                            role="tablist"
                            aria-label="Pick a month"
                        >
                            {MONTH_ABBR.map((abbr, i) => {
                                const m = i + 1;
                                const hasEvents =
                                    (byMonth.get(m)?.size ?? 0) > 0;
                                const selected = m === selMonth;

                                return (
                                    <button
                                        key={m}
                                        ref={selected ? selChipRef : undefined}
                                        type="button"
                                        role="tab"
                                        aria-selected={selected}
                                        className={[
                                            'history-cal-chip',
                                            selected && 'history-cal-chip--sel',
                                            !hasEvents &&
                                                'history-cal-chip--none',
                                        ]
                                            .filter(Boolean)
                                            .join(' ')}
                                        onClick={() => setSelMonth(m)}
                                    >
                                        {abbr}
                                        {hasEvents && (
                                            <span
                                                className="history-cal-chip-dot"
                                                aria-hidden="true"
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <CalendarMonth
                            year={year}
                            month={selMonth}
                            eventsByDay={byMonth.get(selMonth) ?? EMPTY_DAY_MAP}
                            size="large"
                            todayMonthDay={todayMonthDay}
                            onOpen={openEvent}
                        />
                    </>
                ) : (
                    <div className="history-cal-year">
                        {MONTH_ABBR.map((_, i) => {
                            const m = i + 1;

                            return (
                                <CalendarMonth
                                    key={m}
                                    year={year}
                                    month={m}
                                    eventsByDay={
                                        byMonth.get(m) ?? EMPTY_DAY_MAP
                                    }
                                    size="compact"
                                    todayMonthDay={todayMonthDay}
                                    onOpen={openEvent}
                                />
                            );
                        })}
                    </div>
                )}

                <EventSheet
                    open={sheetOpen}
                    onOpenChange={setSheetOpen}
                    mode="read"
                    editingEvent={selectedEvent}
                    triggerRef={lastTriggerRef}
                />
            </HistoryLayout>
        </AppLayout>
    );
}
