import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';

import { count } from '@/lib/plural';
import { CORNER_ROOM } from '@/MiniApps/Corner/Layouts/CornerLayout';
import type { CornerItem, CornerListInfo } from '@/MiniApps/Corner/lib/types';
import CursorListBody from '@/Shell/Components/CursorListBody';
import Fab from '@/Shell/Components/Fab';
import ListNavBand from '@/Shell/Components/ListNavBand';
import type { SortItem } from '@/Shell/Components/ListNavBand';
import Page from '@/Shell/Components/Page';
import SegmentedTabs from '@/Shell/Components/SegmentedTabs';
import { useCursorPagination } from '@/Shell/Hooks/useCursorPagination';
import type { Paginated } from '@/types/paginated';

export type FilterMode = 'all' | 'active' | 'done';

type ListPageProps = {
    list: CornerListInfo;
    paginator: Paginated<CornerItem>;
    /*
     * From the server, for the whole list: recounting the loaded rows would be wrong once only
     * some pages are loaded.
     */
    counts: Record<FilterMode, number>;
    filter: FilterMode;
    query: string;
    sort: string;
    sortItems: SortItem[];
    addLabel: string;
    onAdd: () => void;
    renderItem: (item: CornerItem) => ReactNode;
    emptyState: Record<FilterMode, ReactNode>;
    /* Beside the title: the list's own menu. */
    actions: ReactNode;
};

export default function ListPage({
    list,
    paginator,
    counts,
    filter,
    query,
    sort,
    sortItems,
    addLabel,
    onAdd,
    renderItem,
    emptyState,
    actions,
}: ListPageProps) {
    const pagination = useCursorPagination<CornerItem>({
        initial: paginator,
        propName: 'items',
    });
    const { navigate } = pagination;
    const searching = query.trim() !== '';

    const tabs: Array<{ key: FilterMode; label: string; count: number }> = [
        { key: 'all', label: 'All', count: counts.all },
        { key: 'active', label: list.todo_label, count: counts.active },
        { key: 'done', label: list.done_label, count: counts.done },
    ];

    return (
        <Page
            title={list.name}
            room={CORNER_ROOM}
            backChevron
            actions={actions}
            fab={
                <Fab
                    onClick={onAdd}
                    ariaLabel={addLabel}
                    icon={
                        <Plus aria-hidden="true" size={24} strokeWidth={2.5} />
                    }
                />
            }
        >
            <ListNavBand
                navigating={pagination.navigating}
                count={
                    // Search narrows the counts too, so while searching they read as matches.
                    <span className="text-(length:--text-meta) font-medium text-(--corner-ink-soft) tabular-nums">
                        {searching
                            ? count(counts.all, 'match', 'matches')
                            : count(counts.all, 'thing')}
                    </span>
                }
                sort={sort}
                sortItems={sortItems}
                onSortSelect={(k) => navigate({ sort: k })}
                query={query}
                searchPlaceholder={
                    list.name.length <= 20
                        ? `Search ${list.name}`
                        : 'Search this list'
                }
                onSearch={(v) => navigate({ q: v })}
                tabs={
                    <SegmentedTabs
                        mode="tablist-client"
                        ariaLabel={`Filter ${list.name}`}
                        active={filter}
                        panelId="corner-list-panel"
                        items={tabs}
                        onChange={(k) => navigate({ filter: k })}
                    />
                }
            />

            <CursorListBody
                id="corner-list-panel"
                role="tabpanel"
                list={pagination}
                query={query}
                noMatchesNoun="things"
                empty={emptyState[filter]}
                renderItem={(item) => (
                    <div key={item.id}>{renderItem(item)}</div>
                )}
                listClassName="corner-item-grid grid [align-items:start] gap-4"
                footerWhenEmpty
            />
        </Page>
    );
}
