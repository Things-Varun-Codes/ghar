import type { RefObject } from 'react';

import ErrorState from '@/Shell/Components/ErrorState';

type Props = {
    loadingMore: boolean;
    loadError: boolean;
    onRetry: () => void;
    sentinelRef: RefObject<HTMLDivElement | null>;
};

export default function ListLoadMoreState({
    loadingMore,
    loadError,
    onRetry,
    sentinelRef,
}: Props) {
    return (
        <>
            {loadingMore && (
                <p
                    role="status"
                    aria-busy="true"
                    className="m-0 text-(length:--text-small) text-(--shell-text-muted)"
                >
                    Loading more…
                </p>
            )}

            {loadError && (
                <ErrorState
                    variant="inline"
                    message="Couldn't load more."
                    onRetry={onRetry}
                />
            )}

            <div ref={sentinelRef} className="h-[1px]" />
        </>
    );
}
