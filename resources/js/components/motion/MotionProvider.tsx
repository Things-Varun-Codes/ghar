import { MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';

/*
 * Once, around the app. "user" follows the system's reduce-motion setting: transforms and
 * layout moves stop, fades stay. The CSS side is one block in app.css.
 */
export default function MotionProvider({ children }: { children: ReactNode }) {
    return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
