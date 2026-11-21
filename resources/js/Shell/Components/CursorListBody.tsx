import type { AriaRole, ReactNode } from 'react';

import { Settle, SettleItem } from '@/components/motion';
import EmptyState, { noMatchesTitle } from '@/Shell/Components/EmptyState';
import LoadMoreScroll from '@/Shell/Components/LoadMoreScroll';
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
 * load-more footer (LoadMoreScroll), all dimmed while a filter, sort or search visit is pending.
 * A page's first rows settle in; rows that arrive later appear in place.
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
                    <LoadMoreScroll prop={prop} className={listClassName}>
                        {items.map((item, index) => (
                            <SettleItem key={item.id} index={index}>
                                {renderItem(item)}
                            </SettleItem>
                        ))}
                    </LoadMoreScroll>
                </Settle>
            )}
        </div>
    );
}
