import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';

import { CORNER_ROOM } from '@/MiniApps/Corner/Layouts/CornerLayout';
import type { CornerItem, CornerListInfo } from '@/MiniApps/Corner/lib/types';
import CursorListBody from '@/Shell/Components/CursorListBody';
import Fab from '@/Shell/Components/Fab';
import ListNavBand from '@/Shell/Components/ListNavBand';
import type { SortItem } from '@/Shell/Components/ListNavBand';
import Page from '@/Shell/Components/Page';
import SegmentedTabs from '@/Shell/Components/SegmentedTabs';
import { useListNavigation } from '@/Shell/Hooks/useListNavigation';
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
}: ListPageProps) {
    const navigation = useListNavigation();
    const { navigate } = navigation;

    const tabs: Array<{ key: FilterMode; label: string; count: number }> = [
        { key: 'all', label: 'All', count: counts.all },
        { key: 'active', label: list.todo_label, count: counts.active },
        {
            key: 'done',
            // On a per-person list the tab is the viewer's own.
            label: list.done_per_person
                ? `${list.done_label} by me`
                : list.done_label,
            count: counts.done,
        },
    ];

    return (
        <Page
            title={list.name}
            room={CORNER_ROOM}
            backChevron
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
                navigating={navigation.navigating}
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
                prop="items"
                items={paginator.data}
                navigation={navigation}
                query={query}
                noMatchesNoun="things"
                empty={emptyState[filter]}
                renderItem={renderItem}
                listClassName="corner-item-grid grid [align-items:start] gap-4"
                footerWhenEmpty
            />
        </Page>
    );
}
