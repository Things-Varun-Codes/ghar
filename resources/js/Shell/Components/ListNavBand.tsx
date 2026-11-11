import { Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import ListSortControl from '@/Shell/Components/ListSortControl';
import type { SortItem } from '@/Shell/Components/ListSortControl';
import { Spinner } from '@/Shell/Components/Spinner';
import Toolbar from '@/Shell/Components/Toolbar';

export type { SortItem };

export type ListNavBandProps = {
    count?: ReactNode;
    /**
     * Already delay-gated (~250ms) Mode-B pending flag from
     * `useCursorPagination`. Renders the shared spinner beside the count.
     * The band owns no timer — do not introduce a second one.
     */
    navigating?: boolean;
    sort?: string;
    sortItems?: SortItem[];
    onSortSelect: (key: string) => void;
    query?: string;
    searchPlaceholder?: string;
    onSearch: (value: string | undefined) => void;
    tabs?: ReactNode;
};

export default function ListNavBand({
    count,
    navigating,
    sort,
    sortItems,
    onSortSelect,
    query,
    searchPlaceholder,
    onSearch,
    tabs,
}: ListNavBandProps) {
    const [searchValue, setSearchValue] = useState(query ?? '');

    useEffect(() => {
        // Keep local state in sync when the server prop changes out from
        // under us (e.g. browser back/forward, or a reload from elsewhere).
        // eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors the server query prop into the editable field
        setSearchValue(query ?? '');
    }, [query]);

    useEffect(() => {
        if (searchPlaceholder === undefined) {
            return;
        }

        if (searchValue === (query ?? '')) {
            return;
        }

        const timeout = setTimeout(() => {
            onSearch(searchValue || undefined);
        }, 300);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce follows typing only; onSearch and query change identity on every render
    }, [searchValue]);

    const searchNode =
        searchPlaceholder !== undefined ? (
            <div className="list-nav-band-search">
                <Search
                    aria-hidden="true"
                    size={16}
                    strokeWidth={2}
                    className="shell-list-search-icon"
                />
                <input
                    type="text"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    placeholder={searchPlaceholder}
                    aria-label={searchPlaceholder}
                    className="shell-list-search"
                />
            </div>
        ) : null;

    const sortNode = sortItems ? (
        <ListSortControl
            sort={sort ?? 'recent'}
            items={sortItems}
            onSelect={onSortSelect}
        />
    ) : null;

    return (
        <>
            {tabs !== undefined && (
                <div className="list-nav-band-tabs">{tabs}</div>
            )}

            <Toolbar
                sticky={false}
                className="list-nav-band"
                count={
                    // Wrapped unconditionally (even with no spinner) so the
                    // count's own geometry never shifts as `navigating`
                    // toggles. Toolbar's left slot is already a block-level
                    // div, so this inline-flex span changes no band layout.
                    <span className="inline-flex items-center gap-1.5">
                        {count ?? null}
                        {navigating && (
                            <Spinner className="size-3.5 text-(--shell-text-muted)" />
                        )}
                    </span>
                }
                controls={
                    searchNode || sortNode ? (
                        <div className="list-nav-band-controls">
                            {searchNode}
                            {sortNode}
                        </div>
                    ) : null
                }
            />
        </>
    );
}
