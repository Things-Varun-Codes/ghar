import { useRef } from 'react';
import type { ReactNode } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { count } from '@/lib/plural';
import { momentLabel } from '@/MiniApps/History/lib/places';
import type { Place } from '@/MiniApps/History/lib/places';

type Props = {
    place: Place;
    onOpen: (id: number, trigger: HTMLElement | null) => void;
    className: string;
    children: ReactNode;
};

/* A place on the map or in the list: one moment opens straight away, several ask which. */
export default function PlaceButton({
    place,
    onOpen,
    className,
    children,
}: Props) {
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const [only] = place.moments;

    if (place.moments.length === 1) {
        return (
            <button
                type="button"
                className={className}
                aria-label={`${place.label}: ${momentLabel(only)}`}
                onClick={(e) => onOpen(only.id, e.currentTarget)}
            >
                {children}
            </button>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                ref={triggerRef}
                className={className}
                aria-label={`${place.label}: ${place.moments.length} moments, choose one to open`}
            >
                {children}
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                collisionPadding={12}
                className="history-cal-daymenu"
            >
                {/* Base UI only lets a menu label sit inside a group. */}
                <DropdownMenuGroup>
                    <DropdownMenuLabel className="history-cal-daymenu-head">
                        {place.label} · {count(place.moments.length, 'moment')}
                    </DropdownMenuLabel>
                    {place.moments.map((moment) => (
                        <DropdownMenuItem
                            key={moment.id}
                            className="history-cal-daymenu-row"
                            onClick={() =>
                                onOpen(moment.id, triggerRef.current)
                            }
                        >
                            <span className="history-cal-daymenu-text">
                                <span className="history-cal-daymenu-title">
                                    {momentLabel(moment)}
                                </span>
                                {moment.title && (
                                    <span className="history-cal-daymenu-sub">
                                        {moment.date_label}
                                    </span>
                                )}
                            </span>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
