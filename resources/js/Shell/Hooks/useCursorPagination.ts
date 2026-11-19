import { router } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { captureSilent } from '@/lib/observability';
import { useListNavigation } from '@/Shell/Hooks/useListNavigation';

export type CursorPaginator<T> = {
    data: T[];
    next_page_url: string | null;
};

type VisitId = unknown;

type VisitScope = { id: VisitId; only: string[]; except: string[] };

type BeforeDetail = { visit: VisitScope };
type SuccessDetail = {
    page: { props: Record<string, unknown> };
    visitId?: VisitId;
};
type FinishDetail = { visit: VisitScope };
type NavigateDetail = {
    page: { props: Record<string, unknown> };
    type: string;
};

export interface UseCursorPaginationOptions<T> {
    initial: CursorPaginator<T>;
    propName: string;
    /**
     * Also re-seed when these change. Rarely needed: any server response that carries the
     * list, except the hook's own load-more, re-seeds it already.
     */
    resetKey?: unknown[];
}

export interface UseCursorPaginationReturn<T> {
    items: T[];
    sentinelRef: React.RefObject<HTMLDivElement | null>;
    loadingMore: boolean;
    navigate: (patch: Record<string, string | undefined>) => void;
    navigating: boolean;
    loadError: boolean;
    retryLoadMore: () => void;
    /** Refetches the first page and updates the rows already shown, keeping later pages. */
    refreshInPlace: () => void;
}

function asksFor(visit: VisitScope, propName: string): boolean {
    return (
        (visit.only.length === 0 || visit.only.includes(propName)) &&
        !visit.except.includes(propName)
    );
}

/*
 * History's Timeline and Gallery: load more by hand, re-seed from any response that carries
 * the list. The rooms' lists (ListPage on the server) use CursorListBody, which loads more
 * through Inertia's InfiniteScroll instead.
 */
export function useCursorPagination<T extends { id: number | string }>({
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

    const { navigate, navigating } = useListNavigation();

    // Bumped on every re-seed, so a load-more answered afterwards can't append to the new list.
    const seedRef = useRef(0);
    // Visits this hook started: their responses extend the list instead of replacing it.
    const ownVisitsRef = useRef(new Set<VisitId>());

    const reseed = useCallback((paginator: CursorPaginator<T>) => {
        seedRef.current += 1;
        setItems(paginator.data);
        setPaginatorMeta({ next_page_url: paginator.next_page_url });
        // A fresh list means a stale load-more failure must not survive the re-seed.
        setLoadError(false);
    }, []);

    const markOwn = useCallback((visit: { id: VisitId }) => {
        ownVisitsRef.current.add(visit.id);
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- re-seeds accumulated items from fresh Inertia props
        reseed(initial);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- the caller-supplied resetKey is the dependency list
    }, resetKey ?? []);

    // A mutation's redirect, a reload or a filter change can answer with a first page identical
    // to the one shown (Inertia then keeps the old prop object), while the rows loaded below it
    // have changed. So the list re-seeds on every response that asked for it, not on a new prop.
    // The success event fires after the page has rendered with that response.
    useEffect(() => {
        const asked = new Map<VisitId, boolean>();

        const onBefore = (event: Event) => {
            const { visit } = (event as CustomEvent<BeforeDetail>).detail;
            asked.set(visit.id, asksFor(visit, propName));
        };

        const reseedFrom = (props: Record<string, unknown>) => {
            const next = props[propName] as CursorPaginator<T> | undefined;

            if (next && Array.isArray(next.data)) {
                reseed(next);
            }
        };

        const onSuccess = (event: Event) => {
            const { page, visitId } = (event as CustomEvent<SuccessDetail>)
                .detail;
            const askedForList = asked.get(visitId) ?? true;
            asked.delete(visitId);

            if (ownVisitsRef.current.delete(visitId) || !askedForList) {
                return;
            }

            reseedFrom(page.props);
        };

        // Back or forward restores a page from browser history without a request.
        const onNavigate = (event: Event) => {
            const { page, type } = (event as CustomEvent<NavigateDetail>)
                .detail;

            if (type === 'history') {
                reseedFrom(page.props);
            }
        };

        const onFinish = (event: Event) => {
            const { visit } = (event as CustomEvent<FinishDetail>).detail;
            asked.delete(visit.id);
            ownVisitsRef.current.delete(visit.id);
        };

        document.addEventListener('inertia:before', onBefore);
        document.addEventListener('inertia:success', onSuccess);
        document.addEventListener('inertia:finish', onFinish);
        document.addEventListener('inertia:navigate', onNavigate);

        return () => {
            document.removeEventListener('inertia:before', onBefore);
            document.removeEventListener('inertia:success', onSuccess);
            document.removeEventListener('inertia:finish', onFinish);
            document.removeEventListener('inertia:navigate', onNavigate);
        };
    }, [propName, reseed]);

    const loadMore = useCallback(() => {
        if (!paginatorMeta.next_page_url || loadingMore) {
            return;
        }

        const seed = seedRef.current;
        const current = () => seed === seedRef.current;

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

            if (current()) {
                setLoadError(true);
            }
        };

        setLoadingMore(true);
        router.get(
            paginatorMeta.next_page_url,
            {},
            {
                preserveScroll: true,
                preserveState: true,
                // A cursor URL in the address bar would make a hard refresh load only that slice.
                preserveUrl: true,
                only: [propName],
                onBefore: markOwn,
                onSuccess: (page) => {
                    if (!current()) {
                        return;
                    }

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
    }, [paginatorMeta.next_page_url, loadingMore, propName, markOwn]);

    const retryLoadMore = useCallback(() => {
        setLoadError(false);
        loadMore();
    }, [loadMore]);

    const refreshInPlace = useCallback(() => {
        router.reload({
            only: [propName],
            onBefore: markOwn,
            onSuccess: (page) => {
                const fresh = (page.props[propName] as CursorPaginator<T>).data;
                const byId = new Map(fresh.map((item) => [item.id, item]));
                setItems((prev) =>
                    prev.map((item) => byId.get(item.id) ?? item),
                );
            },
        });
    }, [propName, markOwn]);

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

    return {
        items,
        sentinelRef,
        loadingMore,
        navigate,
        navigating,
        loadError,
        retryLoadMore,
        refreshInPlace,
    };
}
