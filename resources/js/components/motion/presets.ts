import type { Transition } from 'motion/react';
import { DURATION, EASE } from '@/lib/motion';

export const tween = (seconds: number, delay = 0): Transition => ({
    type: 'tween',
    duration: seconds,
    ease: EASE,
    delay,
});

export type MotionTag = 'div' | 'span' | 'li';

export { DURATION };
