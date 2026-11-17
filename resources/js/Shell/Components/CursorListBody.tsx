import type { AriaRole, ReactNode } from 'react';

import EmptyState, { noMatchesTitle } from '@/Shell/Components/EmptyState';
import ListLoadMoreState from '@/Shell/Components/ListLoadMoreState';
import type { UseCursorPaginationReturn } from '@/Shell/Hooks/useCursorPagination';

type Props<T> = {
    list: Pick<
        UseCursorPaginationReturn<T>,
        | 'items'
        | 'navigating'
        | 'loadingMore'
        | 'loadError'
        | 'retryLoadMore'
        | 'sentinelRef'
        | 'navigate'
    >;
    query: string;
    /* What the list holds, plural: "No notes match …". */
    noMatchesNoun: string;
    noMatchesBody?: string;
    /* Shown when the list is empty and nothing is searched for. */
    empty: ReactNode;
    /* The returned element must carry a key. */
    renderItem: (item: T) => ReactNode;
    /* On the element holding the rows and the load-more footer: a grid, a feed. */
    listClassName?: string;
    /* Keep the load-more footer under an empty state too. */
    footerWhenEmpty?: boolean;
    id?: string;
    role?: AriaRole;
};

/*
 * The body of a cursor-paginated list: its rows, the empty and no-matches states, the
 * load-more footer, all dimmed while a filter, sort or search visit is pending.
 */
export default function CursorListBody<T>({
    list,
    query,
    noMatchesNoun,
    noMatchesBody,
    empty,
    renderItem,
    listClassName,
    footerWhenEmpty = false,
    id,
    role,
}: Props<T>) {
    const searchedFor = query.trim();

    const footer = (
        <ListLoadMoreState
            loadingMore={list.loadingMore}
            loadError={list.loadError}
            onRetry={list.retryLoadMore}
            sentinelRef={list.sentinelRef}
        />
    );

    return (
        <div
            id={id}
            role={role}
            className={list.navigating ? 'shell-list-pending' : undefined}
            aria-busy={list.navigating}
        >
            {list.items.length === 0 ? (
                <>
                    {searchedFor !== '' ? (
                        <EmptyState
                            title={noMatchesTitle(noMatchesNoun, searchedFor)}
                            body={noMatchesBody}
                            query={query}
                            onClearSearch={() =>
                                list.navigate({ q: undefined })
                            }
                        />
                    ) : (
                        empty
                    )}
                    {footerWhenEmpty && footer}
                </>
            ) : (
                <div className={listClassName}>
                    {list.items.map(renderItem)}
                    {footer}
                </div>
            )}
        </div>
    );
}
