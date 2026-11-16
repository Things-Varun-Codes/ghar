import { useEffect, useState } from 'react';

export type KeyboardViewport = { height: number; offsetTop: number } | null;

/*
 * iOS dvh does not shrink for the keyboard, so a bottom sheet would keep its footer under it.
 * visualViewport is the only signal for the covered area: more than 100px missing is a
 * keyboard (a URL bar showing takes about 50px). Portrait only: a collapsing URL bar in
 * landscape reads like a keyboard.
 *
 * Returns the visible area while the keyboard is up, null otherwise.
 */
export function useKeyboardViewport(active: boolean): KeyboardViewport {
    const [metrics, setMetrics] = useState<KeyboardViewport>(null);

    useEffect(() => {
        const vv = window.visualViewport;

        if (!active || !vv) {
            return;
        }

        const portrait = window.matchMedia('(orientation: portrait)');

        const sync = () => {
            const keyboardUp =
                portrait.matches &&
                window.innerHeight - vv.height - vv.offsetTop > 100;

            setMetrics((prev) => {
                if (!keyboardUp) {
                    return null;
                }

                return prev?.height === vv.height &&
                    prev.offsetTop === vv.offsetTop
                    ? prev
                    : { height: vv.height, offsetTop: vv.offsetTop };
            });
        };

        sync();
        vv.addEventListener('resize', sync);
        vv.addEventListener('scroll', sync);

        return () => {
            vv.removeEventListener('resize', sync);
            vv.removeEventListener('scroll', sync);
            setMetrics(null);
        };
    }, [active]);

    return metrics;
}
