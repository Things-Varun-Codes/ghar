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
                }}
                data-settled={settled ? '' : undefined}
            >
                <div
                    className="shell-pull-spinner"
                    data-spinning={refreshing ? '' : undefined}
                    style={{
                        width: `${SPINNER_SIZE}px`,
                        height: `${SPINNER_SIZE}px`,
                    }}
                />
            </div>

            <div
                className="shell-pull-content"
                data-settled={settled ? '' : undefined}
                style={{
                    // Must be `none` at rest: any transform makes this the containing block for the
                    // fixed Fab.
                    transform:
                        pullDistance > 0
                            ? `translateY(${pullDistance}px)`
                            : 'none',
                    willChange: pullDistance > 0 ? 'transform' : 'auto',
                }}
            >
                {children}
            </div>
        </div>
    );
}
