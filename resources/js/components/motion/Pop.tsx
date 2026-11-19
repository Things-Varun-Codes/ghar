import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import type { MotionTag } from './presets';
import { DURATION, tween } from './presets';

type Props = {
    /* While false the children shrink away and unmount. */
    show?: boolean;
    /*
     * A new value scales the children in again (a stamp going from Issued to Paid). Never on
     * first render: a room's objects don't move as the page loads.
     */
    changeKey?: string | number;
    as?: MotionTag;
    className?: string;
    children: ReactNode;
};

/*
 * A small thing that has just changed scales in from 0.9, never past 1. Put it on a wrapper:
 * an element with its own tilt or .shell-press keeps its transform.
 */
export default function Pop({
    show = true,
    changeKey,
    as = 'span',
    className,
    children,
}: Props) {
    const Tag = motion[as];

    return (
        <AnimatePresence initial={false} mode="popLayout">
            {show && (
                <Tag
                    key={changeKey ?? 'pop'}
                    className={className}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{
                        opacity: 1,
                        scale: 1,
                        transition: tween(DURATION.in),
                    }}
                    exit={{
                        opacity: 0,
                        scale: 0.9,
                        transition: tween(DURATION.out),
                    }}
                >
                    {children}
                </Tag>
            )}
        </AnimatePresence>
    );
}
