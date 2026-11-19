import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import type { MotionTag } from './presets';
import { DURATION, tween } from './presets';

type Props = {
    show?: boolean;
    appear?: boolean;
    as?: MotionTag;
    className?: string;
    children: ReactNode;
};

/* Fades in while rising 6px; leaves by fading only. */
export default function Rise({
    show = true,
    appear = false,
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
                    initial={{ opacity: 0, y: 6 }}
                    animate={{
                        opacity: 1,
                        y: 0,
                        transition: tween(DURATION.card),
                    }}
                    exit={{ opacity: 0, transition: tween(DURATION.out) }}
                >
                    {children}
                </Tag>
            )}
        </AnimatePresence>
    );
}
