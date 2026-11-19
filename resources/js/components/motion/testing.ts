import { MotionGlobalConfig } from 'motion/react';

/* Vitest: every animation completes at once, so an exit never holds a node under fake timers. */
export function skipMotionInTests(): void {
    MotionGlobalConfig.skipAnimations = true;
}
