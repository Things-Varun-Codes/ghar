import { useEffect } from 'react';
import type { RefObject } from 'react';

const KEYBOARD_MIN_INSET = 120;

/**
 * Lifts a centered dialog above the iOS keyboard. Radix centers in the layout
 * viewport, which the keyboard does not shrink, so it would cover the lower
 * half; visualViewport is the only reliable signal for keyboard height there.
 */
export function useKeyboardAwareDialog(ref: RefObject<HTMLDivElement | null>) {
    useEffect(() => {
        const vv = window.visualViewport;

        if (!vv) {
            return;
        }

        const apply = () => {
            const el = ref.current;

            if (!el) {
                return;
            }

            const inset = window.innerHeight - vv.height - vv.offsetTop;

            if (inset > KEYBOARD_MIN_INSET) {
                el.style.top = `${vv.offsetTop + 12}px`;
                el.style.translate = '-50% 0';
                el.style.maxHeight = `${vv.height - 24}px`;
                el.style.overflowY = 'auto';
            } else {
                el.style.top = '';
                el.style.translate = '';
                el.style.maxHeight = '';
                el.style.overflowY = '';
            }
        };

        apply();
        vv.addEventListener('resize', apply);
        vv.addEventListener('scroll', apply);

        return () => {
            vv.removeEventListener('resize', apply);
            vv.removeEventListener('scroll', apply);
        };
    }, [ref]);
}
