import { InfiniteScroll } from '@inertiajs/react';
import type { AriaRole, ReactNode } from 'react';
import { useState } from 'react';

import { Settle, SettleItem } from '@/components/motion';
import { captureSilent } from '@/lib/observability';
import EmptyState, { noMatchesTitle } from '@/Shell/Components/EmptyState';
import ListLoadMoreState from '@/Shell/Components/ListLoadMoreState';
import type { ListNavigation } from '@/Shell/Hooks/useListNavigation';

type Props<T> = {
    /* The page prop holding the list: an Inertia::scroll prop (ListPage on the server). */
    prop: string;
    /* That prop's rows, as the page has them: load more appends to them. */
    items: T[];
    navigation: ListNavigation;
    query: string;
    /* What the list holds, plural: "No notes match …". */
    noMatchesNoun: string;
    noMatchesBody?: string;
    /* Shown when the list is empty and nothing is searched for. */
    empty: ReactNode;
    renderItem: (item: T) => ReactNode;
    /* On the element holding the rows: a grid, a feed. Each row is wrapped in one div. */
    listClassName?: string;
    /* Keep the load-more footer under an empty state too. */
    footerWhenEmpty?: boolean;
    id?: string;
    role?: AriaRole;
};

/*
 * The body of a cursor-paginated list: its rows, the empty and no-matches states, the
 * load-more footer, all dimmed while a filter, sort or search visit is pending. Inertia's
 * InfiniteScroll fetches the next page as the footer nears the viewport; a failed fetch stops
 * the automatic loading and offers a retry. A page's first rows settle in; rows that arrive
 * later appear in place.
 */
export default function CursorListBody<T extends { id: number | string }>({
    prop,
    items,
    navigation,
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
    const [loadError, setLoadError] = useState(false);

    const failed = (reason: string, detail: unknown) => {
        captureSilent(new Error(`${prop}.load-more failed`), {
            component: 'Shell/CursorListBody',
            action: `${prop}.load-more`,
            surface: 'frontend',
            extra: { payload: { reason, detail } },
        });
        setLoadError(true);
    };

    return (
        <div
            id={id}
            role={role}
            className={navigation.navigating ? 'shell-list-pending' : undefined}
            aria-busy={navigation.navigating}
        >
            {items.length === 0 &&
                (searchedFor !== '' ? (
                    <EmptyState
                        title={noMatchesTitle(noMatchesNoun, searchedFor)}
                        body={noMatchesBody}
                        query={query}
                        onClearSearch={() =>
                            navigation.navigate({ q: undefined })
                        }
                    />
                ) : (
                    empty
                ))}

            {(items.length > 0 || footerWhenEmpty) && (
                <Settle>
                    <InfiniteScroll
                        data={prop}
                        className={listClassName}
                        // A cursor in the address bar would make a refresh load only that slice.
                        preserveUrl
                        onlyNext
                        buffer={200}
                        // After a failure the footer waits for "Try again" instead of retrying
                        // every time it scrolls into view.
                        manual={loadError}
                        params={{
                            onSuccess: () => setLoadError(false),
                            // Returning false keeps Inertia's error dialog and its unhandled
                            // rejection away: the footer is the visible, recoverable surface.
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
                        {items.map((item, index) => (
                            <SettleItem key={item.id} index={index}>
                                {renderItem(item)}
                            </SettleItem>
                        ))}
                    </InfiniteScroll>
                </Settle>
            )}
        </div>
    );
}
