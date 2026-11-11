import type { ReactNode } from 'react';
import { usePullToRefresh } from '@/Shell/Hooks/usePullToRefresh';

const THRESHOLD = 80;
const SPINNER_SIZE = 24;

export default function PullToRefresh({ children }: { children: ReactNode }) {
    const { pullDistance, refreshing } = usePullToRefresh({
        threshold: THRESHOLD,
    });

    const indicatorOpacity = Math.min(pullDistance / THRESHOLD, 1);
    const settled = pullDistance === 0 && !refreshing;

    return (
        <div className="relative overscroll-y-contain">
            <div
                aria-hidden="true"
                className="shell-pull-indicator"
                style={{
                    transform: `translate(-50%, ${pullDistance - 40}px)`,
                    opacity: indicatorOpacity,
                    transition: settled
                        ? 'opacity 180ms ease-out, transform 180ms ease-out'
                        : 'none',
                }}
            >
                <div
                    className="shell-pull-spinner"
                    style={{
                        width: `${SPINNER_SIZE}px`,
                        height: `${SPINNER_SIZE}px`,
                        animation: refreshing
                            ? 'ptr-spin 0.8s linear infinite'
                            : 'none',
                    }}
                />
            </div>

            <div
                style={{
                    // Must be `none` at rest: any transform makes this the containing block for the
                    // fixed Fab.
                    transform:
                        pullDistance > 0
                            ? `translateY(${pullDistance}px)`
                            : 'none',
                    transition: settled ? 'transform 180ms ease-out' : 'none',
                    willChange: pullDistance > 0 ? 'transform' : 'auto',
                }}
            >
                {children}
            </div>
        </div>
    );
}
