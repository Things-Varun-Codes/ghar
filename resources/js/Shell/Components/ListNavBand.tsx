import { ArrowDownUp, Search, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

import { Pop } from '@/components/motion';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
} from '@/components/ui/input-group';
import ChoiceMenu from '@/Shell/Components/ChoiceMenu';
import type { ChoiceItem } from '@/Shell/Components/ChoiceMenu';
import { Spinner } from '@/Shell/Components/Spinner';
import Toolbar from '@/Shell/Components/Toolbar';

export type SortItem = ChoiceItem;

export type ListNavBandProps = {
    count?: ReactNode;
    /**
     * Already delay-gated (~250ms) pending flag from
     * `useListNavigation`. Renders the shared spinner beside the count.
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
    const searchInput = useRef<HTMLInputElement>(null);
    // Clearing skips the typing debounce but still goes through it, so only one visit fires.
    const clearNow = useRef(false);

    const clearSearch = () => {
        clearNow.current = true;
        setSearchValue('');
        searchInput.current?.focus();
    };

    useEffect(() => {
        // Keep local state in sync when the server prop changes out from
        // under us (e.g. browser back/forward, or a reload from elsewhere).
        // eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors the server query prop into the editable field
        setSearchValue(query ?? '');
    }, [query]);

    useEffect(() => {
        const delay = clearNow.current ? 0 : 300;
        clearNow.current = false;

        if (searchPlaceholder === undefined) {
            return;
        }

        if (searchValue === (query ?? '')) {
            return;
        }

        const timeout = setTimeout(() => {
            onSearch(searchValue || undefined);
        }, delay);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce follows typing only; onSearch and query change identity on every render
    }, [searchValue]);

    const searchNode =
        searchPlaceholder !== undefined ? (
            <InputGroup className="list-nav-band-search shell-list-search-group">
                <InputGroupAddon className="shell-list-search-icon">
                    <Search aria-hidden="true" size={16} strokeWidth={1.5} />
                </InputGroupAddon>
                <InputGroupInput
                    ref={searchInput}
                    type="search"
                    enterKeyHint="search"
                    autoComplete="off"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape' && searchValue !== '') {
                            e.preventDefault();
                            clearSearch();
                        }
                    }}
                    placeholder={searchPlaceholder}
                    aria-label={searchPlaceholder}
                    className="shell-list-search"
                />
                <InputGroupAddon align="inline-end">
                    <Pop show={searchValue !== ''} className="inline-flex">
                        <InputGroupButton
                            onClick={clearSearch}
                            aria-label="Clear search"
                            className="shell-list-search-clear"
                        >
                            <X size={16} strokeWidth={1.5} aria-hidden="true" />
                        </InputGroupButton>
                    </Pop>
                </InputGroupAddon>
            </InputGroup>
        ) : null;

    const sortNode = sortItems ? (
        <ChoiceMenu
            label="Sort"
            icon={ArrowDownUp}
            value={sort ?? 'recent'}
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
