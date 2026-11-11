import type { ReactNode } from 'react';
import DayEventMenu from './DayEventMenu';
import type { MediaItem } from './MediaGrid';

export type CalendarEvent = {
    id: number;
    date: string; // 'YYYY-MM-DD'
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
    media: MediaItem[];
    changes: {
        id: number;
        action: string;
        summary: string;
        user_name: string;
        created_at: string;
    }[];
    can: EventPermissions;
};

export type EventPermissions = {
    update: boolean;
    delete: boolean;
};

export const MONTH_NAMES = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function firstThumb(event: CalendarEvent): string | null {
    const withImage = event.media.find((m) => m.thumb || m.poster);

    return withImage ? (withImage.thumb ?? withImage.poster) : null;
}

type Props = {
    year: number;
    month: number; // 1-12
    eventsByDay: Map<number, CalendarEvent[]>;
    size: 'compact' | 'large';
    todayMonthDay: { month: number; day: number } | null;
    onOpen: (event: CalendarEvent, triggerEl?: HTMLElement | null) => void;
};

export default function CalendarMonth({
    year,
    month,
    eventsByDay,
    size,
    todayMonthDay,
    onOpen,
}: Props) {
    const firstDow = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthEventCount = Array.from(eventsByDay.values()).reduce(
        (sum, arr) => sum + arr.length,
        0,
    );

    const cells: ReactNode[] = [];

    for (let i = 0; i < firstDow; i++) {
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
                        aria-label={`${MONTH_NAMES[month - 1]} ${d}: ${label}`}
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
                >
                    {d}
                </div>,
            );
        }
    }

    return (
        <div
            className={`history-cal-month ${size === 'large' ? 'history-cal-month--large' : ''}`}
        >
            <div className="history-cal-month-head">
                <span className="history-cal-month-name">
                    {MONTH_NAMES[month - 1]}
                </span>
                <span className="history-cal-month-count">
                    {monthEventCount > 0
                        ? `${monthEventCount} ${monthEventCount === 1 ? 'moment' : 'moments'}`
                        : ''}
                </span>
            </div>
            <div className="history-cal-dow" aria-hidden="true">
                {DOW.map((d, i) => (
                    <span key={i}>{d}</span>
                ))}
            </div>
            <div className="history-cal-grid">{cells}</div>
        </div>
    );
}
