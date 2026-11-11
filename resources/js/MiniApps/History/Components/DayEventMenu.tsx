import { useRef } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { CalendarEvent } from './CalendarMonth';
import { firstThumb, MONTH_NAMES } from './CalendarMonth';

type Props = {
    month: number; // 1-12
    day: number;
    events: CalendarEvent[]; // length >= 2
    size: 'compact' | 'large';
    todayClass: string; // '' or ' history-cal-today'
    onOpen: (event: CalendarEvent, triggerEl?: HTMLElement | null) => void;
};

export default function DayEventMenu({
    month,
    day,
    events,
    size,
    todayClass,
    onOpen,
}: Props) {
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const firstEvent = events[0];
    const thumb = firstThumb(firstEvent);
    const label = firstEvent.title ?? firstEvent.date_label;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    ref={triggerRef}
                    type="button"
                    className={cn(
                        `history-cal-cell history-cal-cell--event${todayClass}`,
                    )}
                    aria-label={`${MONTH_NAMES[month - 1]} ${day}: ${events.length} moments, choose one to open`}
                    style={
                        thumb
                            ? { backgroundImage: `url("${thumb}")` }
                            : undefined
                    }
                >
                    {!thumb && (
                        <span className="history-cal-dot" aria-hidden="true" />
                    )}
                    <span className="history-cal-num">{day}</span>
                    <span className="history-cal-badge">
                        +{events.length - 1}
                    </span>
                    {size === 'large' && (
                        <span className="history-cal-cap">{label}</span>
                    )}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                collisionPadding={12}
                className="history-cal-daymenu"
            >
                <DropdownMenuLabel className="history-cal-daymenu-head">
                    {MONTH_NAMES[month - 1]} {day} · {events.length} moments
                </DropdownMenuLabel>
                {events.map((event) => {
                    const t = firstThumb(event);
                    const title = event.title ?? event.date_label;
                    const sub = event.location_name
                        ? event.location_name
                        : event.media.length > 0
                          ? `${event.media.length} ${event.media.length === 1 ? 'photo' : 'photos'}`
                          : 'no media';

                    return (
                        <DropdownMenuItem
                            key={event.id}
                            className="history-cal-daymenu-row"
                            onSelect={() => onOpen(event, triggerRef.current)}
                        >
                            <span
                                className={cn(
                                    'history-cal-daymenu-thumb',
                                    !t && 'history-cal-daymenu-thumb--dot',
                                )}
                                aria-hidden="true"
                                style={
                                    t
                                        ? { backgroundImage: `url("${t}")` }
                                        : undefined
                                }
                            />
                            <span className="history-cal-daymenu-text">
                                <span className="history-cal-daymenu-title">
                                    {title}
                                </span>
                                <span className="history-cal-daymenu-sub">
                                    {sub}
                                </span>
                            </span>
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
