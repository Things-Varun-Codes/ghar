import { useEffect, useRef } from 'react';

type Options = {
    intervalMs?: number;
    maxTicks?: number;
};

export function useConversionPolling(
    active: boolean,
    onTick: () => void,
    { intervalMs = 4000, maxTicks = 15 }: Options = {},
): void {
    // Keep the latest onTick in a ref so the interval effect below doesn't have
    // to list it as a dependency (it's a fresh closure each render) — that would
    // re-install the interval on every render and the timer would never fire.
    // Updated in an effect, not during render (react-hooks/refs).
    const onTickRef = useRef(onTick);

    useEffect(() => {
        onTickRef.current = onTick;
    }, [onTick]);

    useEffect(() => {
        if (!active) {
            return;
        }

        let ticks = 0;
        const id = window.setInterval(() => {
            ticks += 1;
            onTickRef.current();

            if (ticks >= maxTicks) {
                window.clearInterval(id);
            }
        }, intervalMs);

        return () => window.clearInterval(id);
    }, [active, intervalMs, maxTicks]);
}
