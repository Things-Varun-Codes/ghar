import { useRef } from 'react';
import type { TouchEventHandler } from 'react';

/* Active only when the sheet content fits without scrolling, so it never fights a scroll. */
type Options = {
    enabled: boolean;
    threshold?: number;
    onDismiss: () => void;
};

export function useSwipeDismiss({
    enabled,
    threshold = 120,
    onDismiss,
}: Options): {
    onTouchStart: TouchEventHandler<HTMLDivElement>;
    onTouchMove: TouchEventHandler<HTMLDivElement>;
    onTouchEnd: TouchEventHandler<HTMLDivElement>;
} {
    const startY = useRef<number | null>(null);
    const delta = useRef<number>(0);
    const armed = useRef<boolean>(false);

    const onTouchStart: TouchEventHandler<HTMLDivElement> = (e) => {
        if (!enabled) {
            return;
        }

        const el = e.currentTarget;
        startY.current = e.touches[0].clientY;
        delta.current = 0;
        // Arm ONLY when the content does not overflow — a scrollable sheet never
        // dismisses by swipe (scroll-up and dismiss are the same drag). When the
        // content fits, scrollTop is always 0 and a pull-down is unambiguous.
        armed.current = el.scrollHeight <= el.clientHeight + 1;
    };

    const onTouchMove: TouchEventHandler<HTMLDivElement> = (e) => {
        if (!enabled || !armed.current || startY.current === null) {
            return;
        }

        delta.current = Math.max(0, e.touches[0].clientY - startY.current);
    };

    const onTouchEnd: TouchEventHandler<HTMLDivElement> = () => {
        if (!enabled) {
            return;
        }

        const finalDelta = delta.current;
        const wasArmed = armed.current;

        startY.current = null;
        delta.current = 0;
        armed.current = false;

        if (wasArmed && finalDelta >= threshold) {
            onDismiss();
        }
    };

    return { onTouchStart, onTouchMove, onTouchEnd };
}
