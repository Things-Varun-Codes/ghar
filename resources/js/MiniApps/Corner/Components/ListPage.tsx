import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import EmptyState from '@/Shell/Components/EmptyState';
import Fab from '@/Shell/Components/Fab';
import ListLoadMoreState from '@/Shell/Components/ListLoadMoreState';
import ListNavBand from '@/Shell/Components/ListNavBand';
import type { SortItem } from '@/Shell/Components/ListSortControl';
import Page from '@/Shell/Components/Page';
import SegmentedTabs from '@/Shell/Components/SegmentedTabs';
import { useCursorPagination } from '@/Shell/Hooks/useCursorPagination';
import type { Paginated } from '@/types/paginated';

type ItemConstraint = {
    id: number;
    added_by_user_id: number;
    done_at: string | null;
};

type FilterMode = 'all' | 'active' | 'done';

type ListPageProps<TItem extends ItemConstraint> = {
    title: string;
    paginator: Paginated<TItem>;
    propName: string;
    /**
     * Server-authoritative {all,active,done} counts — drive the
     * SegmentedTabs counts. NEVER recompute these from loaded rows; that is
     * gives wrong counts once only some pages are loaded.
     */
    counts: { all: number; active: number; done: number };
    filter: FilterMode;
    activeLabel: string;
    doneLabel: string;
    addCtaLabel: string;
    onOpenAddDialog: () => void;
    renderItem: (item: TItem) => ReactNode;
    emptyState?: {
        all?: ReactNode;
        active?: ReactNode;
        done?: ReactNode;
    };
    layout?: 'rows' | 'tiles';
    query?: string;
    searchPlaceholder?: string;
    sort?: string;
    sortItems?: SortItem[];
    singularNoun?: string;
};

export default function ListPage<TItem extends ItemConstraint>({
    title,
    paginator,
    propName,
    counts,
    filter,
    activeLabel,
    doneLabel,
    addCtaLabel,
    onOpenAddDialog,
    renderItem,
    emptyState,
    layout = 'rows',
    query,
    searchPlaceholder,
    sort,
    sortItems,
    singularNoun,
}: ListPageProps<TItem>) {
    const defaultEmpty = (
        <EmptyState
            title={`No ${title.toLowerCase()} yet`}
            body={`Add your first ${title.toLowerCase().replace(/s$/, '')}.`}
        />
    );

    // The reset key needs the counts too: toggle-done moves a row between tabs without changing
    // `all`.
    const {
        items,
        sentinelRef,
        loadingMore,
        navigate,
        navigating,
        loadError,
        retryLoadMore,
    } = useCursorPagination<TItem>({
        initial: paginator,
        propName,
        resetKey: [
            filter,
            sort ?? '',
            query ?? '',
            `${counts.all}-${counts.active}-${counts.done}`,
        ],
    });

    const tabs: Array<{
        id: FilterMode;
        label: string;
        count: number;
    }> = [
        { id: 'all', label: 'All', count: counts.all },
        { id: 'active', label: activeLabel, count: counts.active },
        { id: 'done', label: doneLabel, count: counts.done },
    ];

    return (
        <Page
            tier="index"
            title={title}
            backChevron
            fab={
                <Fab
                    onClick={onOpenAddDialog}
                    ariaLabel={addCtaLabel}
                    icon={
                        <Plus aria-hidden="true" size={24} strokeWidth={2.5} />
                    }
                />
            }
        >
            <ListNavBand
                navigating={navigating}
                count={
                    <span className="text-(length:--text-eyebrow) text-(--corner-ink-soft)">
                        {counts.all}{' '}
                        {counts.all === 1
                            ? (singularNoun ??
                              title
                                  .toLowerCase()
                                  .replace(/ies$/, 'y')
                                  .replace(/s$/, ''))
                            : title.toLowerCase()}
                    </span>
                }
                sort={sort}
                sortItems={sortItems}
                onSortSelect={(k) => navigate({ sort: k })}
                query={query}
                searchPlaceholder={searchPlaceholder}
                onSearch={(v) => navigate({ q: v })}
                tabs={
                    <SegmentedTabs
                        mode="tablist-client"
                        ariaLabel={`Filter ${title.toLowerCase()}`}
                        active={filter}
                        panelId="corner-list-panel"
                        items={tabs.map((t) => ({
                            key: t.id,
                            label: t.label,
                            count: t.count,
                        }))}
                        onChange={(k) => navigate({ filter: k })}
                    />
                }
            />

            <div
                id="corner-list-panel"
                role="tabpanel"
                className={cn(
                    navigating && 'shell-list-pending',
                    layout === 'tiles' && 'corner-tile-grid',
                    'grid [align-items:start] gap-3',
                )}
                aria-busy={navigating}
                style={{
                    ...(layout === 'tiles'
                        ? {}
                        : {
                              gridTemplateColumns:
                                  'repeat(auto-fill, minmax(min(360px, 100%), 1fr))',
                          }),
                }}
            >
                {items.length === 0 ? (
                    <div className="[grid-column:1_/_-1]">
                        {emptyState?.[filter] ?? defaultEmpty}
                    </div>
                ) : (
                    items.map((item) => (
                        <div key={item.id}>{renderItem(item)}</div>
                    ))
                )}

                <ListLoadMoreState
                    loadingMore={loadingMore}
                    loadError={loadError}
                    onRetry={retryLoadMore}
                    sentinelRef={sentinelRef}
                />
            </div>
        </Page>
    );
}
