import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import type { MotionTag } from './presets';
import { DURATION, tween } from './presets';

type Props = {
    show: boolean;
    appear?: boolean;
    as?: MotionTag;
    className?: string;
    children: ReactNode;
};

/*
 * Opens to its height and pushes what's below down smoothly; closes back. Height isn't a
 * transform, so reduced motion is read here: it snaps.
 */
export default function Reveal({
    show,
    appear = false,
    as = 'div',
    className,
    children,
}: Props) {
    const reduce = useReducedMotion();
    const Tag = motion[as];

    return (
        <AnimatePresence initial={appear}>
            {show && (
                <Tag
                    className={className}
                    style={{ overflow: 'hidden' }}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{
                        height: 'auto',
                        opacity: 1,
                        transition: tween(reduce ? 0 : DURATION.card),
                    }}
                    exit={{
                        height: 0,
                        opacity: 0,
                        transition: tween(reduce ? 0 : DURATION.out),
                    }}
                >
                    {children}
                </Tag>
            )}
        </AnimatePresence>
    );
}
