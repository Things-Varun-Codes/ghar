import type { ReactNode } from 'react';
import {
    formatDayMonth,
    monthNames,
    weekdayNames,
    weekStart,
} from '@/lib/dates';
import { count } from '@/lib/plural';
import type { HistoryEvent } from '@/MiniApps/History/lib/types';
import DayEventMenu from './DayEventMenu';

export function firstThumb(event: HistoryEvent): string | null {
    const withImage = event.media.find((m) => m.thumb || m.poster);

    return withImage ? (withImage.thumb ?? withImage.poster) : null;
}

type Props = {
    year: number;
    month: number; // 1-12
    eventsByDay: Map<number, HistoryEvent[]>;
    size: 'compact' | 'large';
    todayMonthDay: { month: number; day: number } | null;
    onOpen: (event: HistoryEvent, triggerEl?: HTMLElement | null) => void;
};

export default function CalendarMonth({
    year,
    month,
    eventsByDay,
    size,
    todayMonthDay,
    onOpen,
}: Props) {
    const firstDay = weekStart();
    // Blank cells before the 1st, counted from the household's first day of the week.
    const pad = (new Date(year, month - 1, 1).getDay() - firstDay + 7) % 7;
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthEventCount = Array.from(eventsByDay.values()).reduce(
        (sum, arr) => sum + arr.length,
        0,
    );

    const cells: ReactNode[] = [];

    for (let i = 0; i < pad; i++) {
        cells.push(
            <div
                key={`pad-${i}`}
                className="history-cal-cell history-cal-cell--pad"
            />,
        );
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const evs = eventsByDay.get(d);
        const isToday =
            todayMonthDay !== null &&
            todayMonthDay.month === month &&
            todayMonthDay.day === d;
        const todayClass = isToday ? ' history-cal-today' : '';
        const current = isToday ? ('date' as const) : undefined;

        if (evs && evs.length > 0) {
            if (evs.length > 1) {
                cells.push(
                    <DayEventMenu
                        key={d}
                        month={month}
                        day={d}
                        events={evs}
                        size={size}
                        todayClass={todayClass}
                        onOpen={onOpen}
                    />,
                );
            } else {
                const event = evs[0];
                const thumb = firstThumb(event);
                const label = event.title ?? event.date_label;
                cells.push(
                    <button
                        key={d}
                        type="button"
                        className={`history-cal-cell history-cal-cell--event${todayClass}`}
                        onClick={() => onOpen(event)}
                        aria-label={`${formatDayMonth(month, d)}: ${label}`}
                        aria-current={current}
                        style={
                            thumb
                                ? { backgroundImage: `url("${thumb}")` }
                                : undefined
                        }
                    >
                        {!thumb && (
                            <span
                                className="history-cal-dot"
                                aria-hidden="true"
                            />
                        )}
                        <span className="history-cal-num">{d}</span>
                        {size === 'large' && (
                            <span className="history-cal-cap">{label}</span>
                        )}
                    </button>,
                );
            }
        } else {
            cells.push(
                <div
                    key={d}
                    className={`history-cal-cell history-cal-cell--empty${todayClass}`}
                    aria-current={current}
                >
                    {d}
                </div>,
            );
        }
    }

    const weeks: ReactNode[][] = [];

    cells.forEach((cell, i) => {
        if (i % 7 === 0) {
            weeks.push([]);
        }

        weeks[weeks.length - 1].push(cell);
    });

    const monthName = monthNames('long')[month - 1];
    const longDays = weekdayNames('long');
    const narrowDays = weekdayNames('narrow');
    const columns = Array.from({ length: 7 }, (_, i) => (firstDay + i) % 7);
    const headingId = `history-cal-${year}-${month}`;

    return (
        <div
            className={`history-cal-month ${size === 'large' ? 'history-cal-month--large' : ''}`}
        >
            <div className="history-cal-month-head">
                <h2 id={headingId} className="history-cal-month-name">
                    {monthName}
                    <span className="sr-only"> {year}</span>
                </h2>
                <span className="history-cal-month-count">
                    {monthEventCount > 0
                        ? count(monthEventCount, 'moment')
                        : ''}
                </span>
            </div>
            {/* A table, not an ARIA grid: the days are plain tab stops with no arrow-key roving. */}
            <div role="table" aria-labelledby={headingId}>
                <div role="row" className="history-cal-dow">
                    {columns.map((dow) => (
                        <span
                            key={dow}
                            role="columnheader"
                            aria-label={longDays[dow]}
                        >
                            <span aria-hidden="true">{narrowDays[dow]}</span>
                        </span>
                    ))}
                </div>
                <div className="history-cal-grid">
                    {weeks.map((week, w) => (
                        <div key={w} role="row" className="history-cal-week">
                            {week.map((cell, c) => (
                                <div
                                    key={c}
                                    role="cell"
                                    className="history-cal-slot"
                                >
                                    {cell}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
