import { router } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { captureSilent } from '@/lib/observability';

export type CursorPaginator<T> = {
    data: T[];
    next_page_url: string | null;
};

// Delay gate for the Mode-B `navigating` flag. Matches Inertia's own
// progress-bar default delay so the two affordances never disagree — a fast
// local round-trip shows neither, a slow one shows both.
const NAVIGATING_DELAY_MS = 250;

export interface UseCursorPaginationOptions<T> {
    initial: CursorPaginator<T>;
    propName: string;
    resetKey: unknown[];
}

export interface UseCursorPaginationReturn<T> {
    items: T[];
    sentinelRef: React.RefObject<HTMLDivElement | null>;
    loadingMore: boolean;
    navigate: (patch: Record<string, string | undefined>) => void;
    navigating: boolean;
    loadError: boolean;
    retryLoadMore: () => void;
}

export function useCursorPagination<T>({
    initial,
    propName,
    resetKey,
}: UseCursorPaginationOptions<T>): UseCursorPaginationReturn<T> {
    const [items, setItems] = useState<T[]>(initial.data);
    const [paginatorMeta, setPaginatorMeta] = useState({
        next_page_url: initial.next_page_url,
    });
    const [loadingMore, setLoadingMore] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const sentinelRef = useRef<HTMLDivElement>(null);

    const visitIdRef = useRef(0);
    const navigatingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );
    const [navigating, setNavigating] = useState(false);

    useEffect(() => {
        return () => {
            if (navigatingTimerRef.current !== null) {
                clearTimeout(navigatingTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- re-seeds accumulated items from fresh Inertia props
        setItems(initial.data);
        setPaginatorMeta({ next_page_url: initial.next_page_url });
        // A fresh list means a stale load-more failure must not survive the
        // re-seed.
        setLoadError(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- the caller-supplied resetKey is the dependency list
    }, resetKey);

    const loadMore = useCallback(() => {
        if (!paginatorMeta.next_page_url || loadingMore) {
            return;
        }

        const reportLoadMoreFailure = (reason: string, detail: unknown) => {
            captureSilent(new Error(`${propName}.load-more failed`), {
                component: 'Shell/useCursorPagination',
                action: `${propName}.load-more`,
                surface: 'frontend',
                extra: {
                    payload: {
                        next_page_url: paginatorMeta.next_page_url,
                        reason,
                        detail,
                    },
                },
            });
            setLoadError(true);
        };

        setLoadingMore(true);
        router.get(
            paginatorMeta.next_page_url,
            {},
            {
                preserveScroll: true,
                preserveState: true,
                preserveUrl: true,
                only: [propName],
                onSuccess: (page) => {
                    const next = page.props[propName] as CursorPaginator<T>;
                    setItems((prev) => [...prev, ...next.data]);
                    setPaginatorMeta({
                        next_page_url: next.next_page_url,
                    });
                    setLoadError(false);
                },
                // eslint-disable-next-line local/no-silent-error -- reports via the shared reportLoadMoreFailure helper above (captureSilent inside it), not inline; the rule's substring scan can't see through the indirection (one shared reporter, not three call sites).
                onError: (errors) => {
                    reportLoadMoreFailure('validation-errors', errors);
                },
                // Transport failure — offline, dead port, DNS, timeout.
                // Returning false suppresses the default rethrow, which
                // would otherwise surface as an unhandled promise rejection
                // (every Playwright tier in this repo escalates that to a
                // hard failure) for a background scroll whose visible
                // surface is already this callback's inline retry row.
                onNetworkError: (error) => {
                    reportLoadMoreFailure('network-error', error.message);

                    return false;
                },
                // Any response status >= 400. Returning false suppresses
                // Inertia's full-screen error dialog — a background scroll
                // must not raise a modal when the footer already owns a
                // visible, recoverable surface for the same event (class 1
                // is excluded from the state-adoption contract on the
                // record).
                onHttpException: (response) => {
                    reportLoadMoreFailure('http-exception', response.status);

                    return false;
                },
                // The one callback guaranteed to run on every path —
                // success, failure, or a cancelled/superseded visit — so it
                // is the sole owner of the pending flag. It makes no failure
                // decision: a cancelled visit clears the pending row without
                // ever touching loadError.
                onFinish: () => {
                    setLoadingMore(false);
                },
            },
        );
    }, [paginatorMeta.next_page_url, loadingMore, propName]);

    const retryLoadMore = useCallback(() => {
        setLoadError(false);
        loadMore();
    }, [loadMore]);

    useEffect(() => {
        const sentinel = sentinelRef.current;

        if (!sentinel) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];

                if (
                    entry.isIntersecting &&
                    paginatorMeta.next_page_url &&
                    !loadingMore &&
                    // Without this guard a persistent failure retries forever: re-observing fires
                    // immediately on an intersecting sentinel.
                    !loadError
                ) {
                    loadMore();
                }
            },
            { rootMargin: '200px' },
        );

        observer.observe(sentinel);

        return () => observer.disconnect();
    }, [paginatorMeta.next_page_url, loadingMore, loadError, loadMore]);

    function navigate(patch: Record<string, string | undefined>) {
        const params = new URLSearchParams(window.location.search);

        for (const [key, value] of Object.entries(patch)) {
            if (value === undefined || value === '') {
                params.delete(key);
            } else {
                params.set(key, value);
            }
        }

        const query = params.toString();
        const url = query
            ? `${window.location.pathname}?${query}`
            : window.location.pathname;

        const visitId = ++visitIdRef.current;

        if (navigatingTimerRef.current !== null) {
            clearTimeout(navigatingTimerRef.current);
        }

        navigatingTimerRef.current = setTimeout(() => {
            if (visitId === visitIdRef.current) {
                setNavigating(true);
            }
        }, NAVIGATING_DELAY_MS);

        router.get(
            url,
            {},
            {
                preserveScroll: false,
                preserveState: true,
                onFinish: () => {
                    // A newer navigate() may own visitIdRef by now; don't clear its pending state.
                    if (visitId !== visitIdRef.current) {
                        return;
                    }

                    if (navigatingTimerRef.current !== null) {
                        clearTimeout(navigatingTimerRef.current);
                        navigatingTimerRef.current = null;
                    }

                    setNavigating(false);
                },
            },
        );
    }

    return {
        items,
        sentinelRef,
        loadingMore,
        navigate,
        navigating,
        loadError,
        retryLoadMore,
    };
}
