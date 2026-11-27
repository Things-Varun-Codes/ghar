import type { MotionStyle } from 'motion/react';
import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { pageIsOpening, SETTLE_STAGGERED } from '@/lib/motion';
import type { MotionTag } from './presets';
import { DURATION, tween } from './presets';

const SettleContext = createContext({ settling: false, opened: false });

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
        <SettleContext.Provider value={{ settling, opened: opening }}>
            {children}
        </SettleContext.Provider>
    );
}

type ItemProps = {
    /* Position in the list; the first SETTLE_STAGGERED step in, the rest arrive with the last. */
    index: number;
    as?: MotionTag;
    className?: string;
    /* On a page that was opened, every row rises in as it scrolls into view, later rows too. */
    reveal?: boolean;
    children: ReactNode;
};

/* One row or door of a Settle. Its wrapper carries the motion, never the card itself. */
export function SettleItem({
    index,
    as = 'div',
    className,
    reveal = false,
    children,
}: ItemProps) {
    const { settling, opened } = useContext(SettleContext);
    const reduce = useReducedMotion();
    const [animate] = useState(settling);
    const [revealing] = useState(reveal && opened);
    const [seen, setSeen] = useState(false);
    const Tag = motion[as];
    const step = Math.min(index, SETTLE_STAGGERED - 1);
    const delay = animate && !reduce ? step * DURATION.stagger : 0;
    const hidden = { opacity: 0, y: reduce ? 0 : 6 };
    const shown = { opacity: 1, y: 0, transition: tween(DURATION.card, delay) };
    // CSS inside the row (a room's markers) times its own entrance from these two.
    const style = { '--settle-delay': `${delay}s` } as MotionStyle;

    if (revealing) {
        return (
            <Tag
                className={className}
                style={style}
                data-settle={seen ? 'in' : undefined}
                initial={hidden}
                whileInView={shown}
                viewport={{ once: true }}
                onViewportEnter={() => setSeen(true)}
            >
                {children}
            </Tag>
        );
    }

    return (
        <Tag
            className={className}
            style={style}
            data-settle={animate ? 'in' : undefined}
            initial={animate ? hidden : false}
            animate={shown}
        >
            {children}
        </Tag>
    );
}
