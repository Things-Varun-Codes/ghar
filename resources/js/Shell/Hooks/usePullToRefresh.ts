import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

export interface UsePullToRefreshOptions {
    threshold?: number;
    onReload?: () => void;
}

export interface UsePullToRefreshReturn {
    pullDistance: number;
    refreshing: boolean;
}

export function usePullToRefresh(
    opts: UsePullToRefreshOptions = {},
): UsePullToRefreshReturn {
    const threshold = opts.threshold ?? 80;
    const [pullDistance, setPullDistance] = useState(0);
    const [refreshing, setRefreshing] = useState(false);

    const startYRef = useRef(0);
    const pullingRef = useRef(false);
    const currentPullRef = useRef(0);
    const rafIdRef = useRef<number | null>(null);
    const refreshingRef = useRef(false);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        if (!window.matchMedia('(hover: none) and (pointer: coarse)').matches) {
            return;
        }

        const flushPullDistance = (value: number) => {
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
            }

            rafIdRef.current = requestAnimationFrame(() => {
                setPullDistance(value);
                rafIdRef.current = null;
            });
        };

        const handleTouchStart = (event: TouchEvent) => {
            if (refreshingRef.current) {
                return;
            }

            if (window.scrollY !== 0) {
                return;
            }

            // Don't arm while an overlay has locked body scroll.
            if (document.body.style.overflow === 'hidden') {
                return;
            }

            const target = event.target as Element | null;

            if (target && target.closest('[data-scroll-container]')) {
                return;
            }

            const touch = event.touches[0];

            if (!touch) {
                return;
            }

            startYRef.current = touch.clientY;
            pullingRef.current = true;
            currentPullRef.current = 0;
        };

        const handleTouchMove = (event: TouchEvent) => {
            if (!pullingRef.current) {
                return;
            }

            const touch = event.touches[0];

            if (!touch) {
                return;
            }

            const delta = touch.clientY - startYRef.current;

            if (delta <= 0) {
                currentPullRef.current = 0;
                flushPullDistance(0);

                return;
            }

            if (delta > 8 && event.cancelable) {
                event.preventDefault();
            }

            const next = Math.min(delta * 0.5, threshold * 1.5);

            currentPullRef.current = next;
            flushPullDistance(next);
        };

        const handleTouchEnd = () => {
            if (!pullingRef.current) {
                return;
            }

            pullingRef.current = false;

            const reached = currentPullRef.current >= threshold;

            currentPullRef.current = 0;

            if (reached && !refreshingRef.current) {
                refreshingRef.current = true;
                setRefreshing(true);
                opts.onReload?.();

                router.reload({
                    onFinish: () => {
                        refreshingRef.current = false;
                        setRefreshing(false);
                        setPullDistance(0);
                    },
                });
            } else {
                setPullDistance(0);
            }
        };

        window.addEventListener('touchstart', handleTouchStart, {
            passive: true,
        });
        window.addEventListener('touchmove', handleTouchMove, {
            passive: false,
        });
        window.addEventListener('touchend', handleTouchEnd, { passive: true });
        window.addEventListener('touchcancel', handleTouchEnd, {
            passive: true,
        });

        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
            window.removeEventListener('touchcancel', handleTouchEnd);

            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
        };
        // opts.onReload is stable in our usage; intentional thin-deps.
        // eslint-disable-next-line react-hooks/exhaustive-deps -- onReload is read when the gesture ends; re-binding touch listeners per render would drop a pull in progress
    }, [threshold]);

    return { pullDistance, refreshing };
}
