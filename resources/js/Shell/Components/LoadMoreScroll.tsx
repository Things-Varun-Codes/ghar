import type { InfiniteScrollRef } from '@inertiajs/core';
import { InfiniteScroll } from '@inertiajs/react';
import type { ReactNode, Ref } from 'react';
import { useState } from 'react';

import { captureSilent } from '@/lib/observability';
import ListLoadMoreState from '@/Shell/Components/ListLoadMoreState';

type Props = {
    /* The page prop holding the list: an Inertia::scroll prop. */
    prop: string;
    children: ReactNode;
    className?: string;
    ref?: Ref<InfiniteScrollRef>;
    /* Told when a load-more fails, and again when one succeeds. */
    onLoadErrorChange?: (failed: boolean) => void;
    /* After each load-more settles, done or not. */
    onLoadFinish?: () => void;
};

/*
 * Loads the next page of a scroll prop as the footer nears the viewport. A failed fetch stops
 * the automatic loading and offers a retry.
 */
export default function LoadMoreScroll({
    prop,
    children,
    className,
    ref,
    onLoadErrorChange,
    onLoadFinish,
}: Props) {
    const [loadError, setLoadErrorState] = useState(false);

    const setLoadError = (failed: boolean) => {
        setLoadErrorState(failed);
        onLoadErrorChange?.(failed);
    };

    const failed = (reason: string, detail: unknown) => {
        captureSilent(new Error(`${prop}.load-more failed`), {
            component: 'Shell/LoadMoreScroll',
            action: `${prop}.load-more`,
            surface: 'frontend',
            extra: { payload: { reason, detail } },
        });
        setLoadError(true);
    };

    return (
        <InfiniteScroll
            ref={ref}
            data={prop}
            className={className}
            // A cursor in the address bar would make a refresh load only that slice.
            preserveUrl
            onlyNext
            buffer={200}
            // After a failure the footer waits for "Try again" instead of retrying every time it
            // scrolls into view.
            manual={loadError}
            params={{
                onSuccess: () => setLoadError(false),
                onFinish: () => onLoadFinish?.(),
                // Returning false keeps Inertia's error dialog and its unhandled rejection away:
                // the footer is the visible, recoverable surface.
                onNetworkError: (error) => {
                    failed('network-error', error.message);

                    return false;
                },
                onHttpException: (response) => {
                    failed('http-exception', response.status);

                    return false;
                },
            }}
            next={({ loading, fetch }) => (
                <ListLoadMoreState
                    loadingMore={loading}
                    loadError={loadError && !loading}
                    onRetry={() => {
                        setLoadError(false);
                        fetch();
                    }}
                />
            )}
        >
            {children}
        </InfiniteScroll>
    );
}
