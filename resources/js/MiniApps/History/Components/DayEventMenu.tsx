import { useRef } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDayMonth } from '@/lib/dates';
import { count } from '@/lib/plural';
import { cn } from '@/lib/utils';
import type { HistoryEvent } from '@/MiniApps/History/lib/types';
import { firstThumb } from './CalendarMonth';

type Props = {
    month: number; // 1-12
    day: number;
    events: HistoryEvent[]; // length >= 2
    size: 'compact' | 'large';
    todayClass: string; // '' or ' history-cal-today'
    onOpen: (event: HistoryEvent, triggerEl?: HTMLElement | null) => void;
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
            <DropdownMenuTrigger
                ref={triggerRef}
                className={cn(
                    `history-cal-cell history-cal-cell--event${todayClass}`,
                )}
                aria-label={`${formatDayMonth(month, day)}: ${events.length} moments, choose one to open`}
                aria-current={todayClass ? 'date' : undefined}
                style={
                    thumb ? { backgroundImage: `url("${thumb}")` } : undefined
                }
            >
                {!thumb && (
                    <span className="history-cal-dot" aria-hidden="true" />
                )}
                <span className="history-cal-num">{day}</span>
                <span className="history-cal-badge">+{events.length - 1}</span>
                {size === 'large' && (
                    <span className="history-cal-cap">{label}</span>
                )}
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                collisionPadding={12}
                className="history-cal-daymenu"
            >
                {/* Base UI only lets a menu label sit inside a group. */}
                <DropdownMenuGroup>
                    <DropdownMenuLabel className="history-cal-daymenu-head">
                        {formatDayMonth(month, day)} ·{' '}
                        {count(events.length, 'moment')}
                    </DropdownMenuLabel>
                    {events.map((event) => {
                        const t = firstThumb(event);
                        const title = event.title ?? event.date_label;
                        const sub = event.location_name
                            ? event.location_name
                            : event.media.length > 0
                              ? count(event.media.length, 'photo')
                              : 'no photos or videos';

                        return (
                            <DropdownMenuItem
                                key={event.id}
                                className="history-cal-daymenu-row"
                                onClick={() =>
                                    onOpen(event, triggerRef.current)
                                }
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
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
