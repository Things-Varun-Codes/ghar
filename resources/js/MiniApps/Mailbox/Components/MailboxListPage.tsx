import { Head, usePage } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { useEffect, useMemo } from 'react';

import { scrollBehavior } from '@/lib/motion';
import { pageTitle as headTitleFor } from '@/lib/title';
import EmptyState, { noMatchesTitle } from '@/Shell/Components/EmptyState';
import Fab from '@/Shell/Components/Fab';
import ListLoadMoreState from '@/Shell/Components/ListLoadMoreState';
import ListNavBand from '@/Shell/Components/ListNavBand';
import type { SortItem } from '@/Shell/Components/ListNavBand';
import Page from '@/Shell/Components/Page';
import SegmentedTabs from '@/Shell/Components/SegmentedTabs';
import { useCursorPagination } from '@/Shell/Hooks/useCursorPagination';
import type { Paginated } from '@/types/paginated';

type ItemConstraint = { id: number };

const DEFAULT_SORT_ITEMS: SortItem[] = [
    { key: 'recent', label: 'Newest first' },
    { key: 'oldest', label: 'Oldest first' },
];

const ROOM = 'Our Mailbox';

type MailboxListPageProps<TItem extends ItemConstraint, TTab extends string> = {
    pageTitle: string;
    paginator: Paginated<TItem>;
    propName: string;
    tab: TTab;
    tabsAriaLabel: string;
    tabItems: Array<{ key: TTab; label: string }>;
    tabHrefFor: (key: TTab) => string;
    countAll: number;
    countNoun: { one: string; other: string };
    sort: string;
    sortItems?: SortItem[];
    query?: string | null;
    searchPlaceholder: string;
    fabAriaLabel: string;
    onFabClick: () => void;
    emptyIcon: ComponentProps<typeof EmptyState>['icon'];
    emptyTitle: string;
    emptyBody: string;
    itemGap?: number;
    /* The returned element must carry key={item.id}. */
    renderItem: (item: TItem, focusedId: number | null) => ReactNode;
    children?: ReactNode;
};

export default function MailboxListPage<
    TItem extends ItemConstraint,
    TTab extends string,
>({
    pageTitle,
    paginator,
    propName,
    tab,
    tabsAriaLabel,
    tabItems,
    tabHrefFor,
    countAll,
    countNoun,
    sort,
    sortItems = DEFAULT_SORT_ITEMS,
    query,
    searchPlaceholder,
    fabAriaLabel,
    onFabClick,
    emptyIcon,
    emptyTitle,
    emptyBody,
    itemGap = 16,
    renderItem,
    children,
}: MailboxListPageProps<TItem, TTab>) {
    const { url } = usePage();

    // Sort and query are in the reset key because navigate() uses preserveState: true.
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
        resetKey: [tab, sort ?? '', query ?? ''],
    });

    const focusedId = useMemo(() => {
        const qs = url.includes('?') ? url.split('?')[1] : '';
        const raw = new URLSearchParams(qs).get('focus');

        if (!raw) {
            return null;
        }

        const parsed = Number.parseInt(raw, 10);

        return Number.isFinite(parsed) ? parsed : null;
    }, [url]);

    useEffect(() => {
        if (focusedId === null) {
            return;
        }

        const id = window.setTimeout(() => {
            const el = document.getElementById(`mailbox-note-${focusedId}`);

            if (el) {
                el.scrollIntoView({
                    behavior: scrollBehavior(),
                    block: 'center',
                });
                el.focus({ preventScroll: true });
            }
        }, 100);

        return () => window.clearTimeout(id);
    }, [focusedId]);

    const isEmpty = items.length === 0;
    const searching = Boolean(query && query.trim() !== '');
    const noun = countAll === 1 ? countNoun.one : countNoun.other;

    return (
        <>
            <Head title={headTitleFor(pageTitle, ROOM)} />

            <Page
                tier="index"
                title={pageTitle}
                backChevron
                fab={
                    <Fab
                        onClick={onFabClick}
                        ariaLabel={fabAriaLabel}
                        icon={
                            <Plus
                                aria-hidden="true"
                                size={24}
                                strokeWidth={2.5}
                            />
                        }
                    />
                }
            >
                <ListNavBand
                    navigating={navigating}
                    count={
                        <span className="text-(length:--text-eyebrow) text-(--mailbox-ink-soft)">
                            {countAll} {noun}
                            {searching &&
                                (countAll === 1 ? ' matches' : ' match')}
                        </span>
                    }
                    sort={sort}
                    sortItems={sortItems}
                    onSortSelect={(k) => navigate({ sort: k })}
                    query={query ?? ''}
                    searchPlaceholder={searchPlaceholder}
                    onSearch={(v) => navigate({ q: v })}
                    tabs={
                        <SegmentedTabs
                            mode="tablist-url"
                            ariaLabel={tabsAriaLabel}
                            active={tab}
                            items={tabItems}
                            hrefFor={tabHrefFor}
                        />
                    }
                />

                <div
                    className={navigating ? 'shell-list-pending' : undefined}
                    aria-busy={navigating}
                >
                    {isEmpty && searching ? (
                        <EmptyState
                            title={noMatchesTitle(countNoun.other, query ?? '')}
                            body="Try another word, or clear the search to see everything."
                            query={query}
                            onClearSearch={() => navigate({ q: undefined })}
                        />
                    ) : isEmpty ? (
                        <EmptyState
                            icon={emptyIcon}
                            title={emptyTitle}
                            body={emptyBody}
                        />
                    ) : (
                        <div
                            className="mailbox-feed"
                            style={
                                {
                                    '--mailbox-feed-gap': `${itemGap}px`,
                                } as React.CSSProperties
                            }
                        >
                            {items.map((item) => renderItem(item, focusedId))}
                            <ListLoadMoreState
                                loadingMore={loadingMore}
                                loadError={loadError}
                                onRetry={retryLoadMore}
                                sentinelRef={sentinelRef}
                            />
                        </div>
                    )}
                </div>
            </Page>

            {children}
        </>
    );
}
