import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import type { MotionTag } from './presets';
import { DURATION, tween } from './presets';

type Props = {
    /* Shared by the same thing in two places, so it glides from one to the other. */
    layoutId?: string;
    /* Grows or shrinks to its new size on the way, not only its new place. */
    resize?: boolean;
    as?: MotionTag;
    className?: string;
    children?: ReactNode;
};

/*
 * Glides to its new place when the order changes (a list moved earlier). Kept to the surfaces
 * that need it: Motion's layout engine is the heaviest part of the library.
 */
export default function Slide({
    layoutId,
    resize = false,
    as = 'div',
    className,
    children,
}: Props) {
    const Tag = motion[as];

    return (
        <Tag
            layout={resize ? true : 'position'}
            layoutId={layoutId}
            className={className}
            transition={{ layout: tween(DURATION.card) }}
        >
            {children}
        </Tag>
    );
}
