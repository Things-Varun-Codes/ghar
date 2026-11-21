import { Link } from '@inertiajs/react';
import type { ComponentProps, ReactNode } from 'react';
import { useId } from 'react';

import { SettleItem } from '@/components/motion';
import { cn } from '@/lib/utils';

type Props = {
    href: string;
    prefetch: ComponentProps<typeof Link>['prefetch'];
    /* The link's text: the door's name. */
    name: ReactNode;
    /* What the room shows of what's behind the door; hidden from assistive tech. */
    peek: ReactNode;
    /* The line under the name, which the link points to as its description. */
    live: ReactNode;
    /* Room classes for the card, the heading and the live line, on top of .shell-door-*. */
    className: string;
    nameClassName?: string;
    liveClassName?: string;
    /* Inside the heading, before the link: an icon. */
    nameBefore?: ReactNode;
    /* Beside the heading, wrapped with it in `headClassName`: a menu. */
    aside?: ReactNode;
    headClassName?: string;
    /*
     * Its place among the landing's doors. Inside a Settle, the doors of a landing just opened
     * rise in one after another; the motion is on a wrapper, since the card lifts on hover.
     */
    settleIndex?: number;
};

/* A card on a room's landing that opens one of its pages from anywhere on it. */
export default function RoomDoor({
    href,
    prefetch,
    name,
    peek,
    live,
    className,
    nameClassName,
    liveClassName,
    nameBefore,
    aside,
    headClassName,
    settleIndex,
}: Props) {
    const liveId = useId();

    const heading = (
        <h2 className={cn('shell-door-name', nameClassName)}>
            {nameBefore}
            <Link
                href={href}
                prefetch={prefetch}
                aria-describedby={liveId}
                className="shell-card-link"
            >
                {name}
            </Link>
        </h2>
    );

    const door = (
        <article
            className={cn(
                className,
                'shell-door shell-card-stretch shell-lift',
            )}
        >
            <div className="shell-door-peek" aria-hidden="true">
                {peek}
            </div>
            {aside === undefined ? (
                heading
            ) : (
                <div className={headClassName}>
                    {heading}
                    {aside}
                </div>
            )}
            <p id={liveId} className={cn('shell-door-live', liveClassName)}>
                {live}
            </p>
        </article>
    );

    return settleIndex === undefined ? (
        door
    ) : (
        <SettleItem index={settleIndex} className="grid">
            {door}
        </SettleItem>
    );
}
