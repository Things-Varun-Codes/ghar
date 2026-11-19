import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { pageIsOpening, SETTLE_STAGGERED } from '@/lib/motion';
import type { MotionTag } from './presets';
import { DURATION, tween } from './presets';

const SettleContext = createContext<boolean>(false);

/*
 * Around a page's list or doors. When the page has just been opened, the items in its first
 * render rise in one after another; anything that mounts later (load more, a filter, a sort, a
 * search, a refresh) and every item on a page restored by back or forward appears in place.
 */
export function Settle({ children }: { children: ReactNode }) {
    const [opening] = useState(pageIsOpening);
    const [settling, setSettling] = useState(opening);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- the first commit is the one that settles; later mounts read false
        setSettling(false);
    }, []);

    return (
        <SettleContext.Provider value={settling}>
            {children}
        </SettleContext.Provider>
    );
}

type ItemProps = {
    /* Position in the list; the first SETTLE_STAGGERED step in, the rest arrive with the last. */
    index: number;
    as?: MotionTag;
    className?: string;
    children: ReactNode;
};

/* One row or door of a Settle. Its wrapper carries the motion, never the card itself. */
export function SettleItem({
    index,
    as = 'div',
    className,
    children,
}: ItemProps) {
    const settling = useContext(SettleContext);
    const reduce = useReducedMotion();
    const [animate] = useState(settling);
    const Tag = motion[as];
    const step = Math.min(index, SETTLE_STAGGERED - 1);

    return (
        <Tag
            className={className}
            data-settle={animate ? 'in' : undefined}
            initial={animate ? { opacity: 0, y: reduce ? 0 : 6 } : false}
            animate={{
                opacity: 1,
                y: 0,
                transition: tween(
                    DURATION.card,
                    reduce ? 0 : step * DURATION.stagger,
                ),
            }}
        >
            {children}
        </Tag>
    );
}
