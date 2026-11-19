import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import type { MotionTag } from './presets';
import { DURATION, tween } from './presets';

type Props = {
    /* While false the children fade out and unmount. */
    show?: boolean;
    /* Fade in on first render too; by default only a later change animates. */
    appear?: boolean;
    /* A picture arriving takes the slower media duration. */
    media?: boolean;
    as?: MotionTag;
    className?: string;
    children: ReactNode;
};

/* Opacity only: for text that swaps (a count, a helper becoming an error) and pictures. */
export default function Fade({
    show = true,
    appear = false,
    media = false,
    as = 'div',
    className,
    children,
}: Props) {
    const Tag = motion[as];

    return (
        <AnimatePresence initial={appear}>
            {show && (
                <Tag
                    className={className}
                    initial={{ opacity: 0 }}
                    animate={{
                        opacity: 1,
                        transition: tween(media ? DURATION.media : DURATION.in),
                    }}
                    exit={{ opacity: 0, transition: tween(DURATION.out) }}
                >
                    {children}
                </Tag>
            )}
        </AnimatePresence>
    );
}
