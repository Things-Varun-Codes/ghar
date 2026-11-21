import { usePage } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { useEffect, useMemo } from 'react';

import { scrollBehavior } from '@/lib/motion';
import { count } from '@/lib/plural';
import { MAILBOX_ROOM } from '@/MiniApps/Mailbox/Layouts/MailboxLayout';
import CursorListBody from '@/Shell/Components/CursorListBody';
import EmptyState from '@/Shell/Components/EmptyState';
import Fab from '@/Shell/Components/Fab';
import ListNavBand from '@/Shell/Components/ListNavBand';
import type { SortItem } from '@/Shell/Components/ListNavBand';
import Page from '@/Shell/Components/Page';
import SegmentedTabs from '@/Shell/Components/SegmentedTabs';
import { useListNavigation } from '@/Shell/Hooks/useListNavigation';
import type { Paginated } from '@/types/paginated';

type ItemConstraint = { id: number };

const DEFAULT_SORT_ITEMS: SortItem[] = [
    { key: 'recent', label: 'Newest first' },
    { key: 'oldest', label: 'Oldest first' },
];

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
    renderItem,
    children,
}: MailboxListPageProps<TItem, TTab>) {
    const { url } = usePage();

    const navigation = useListNavigation();
    const { navigate } = navigation;

    const focusedId = useMemo(() => {
        const raw = new URL(url, 'http://ghar.invalid').searchParams.get(
            'focus',
        );

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

    const searching = Boolean(query && query.trim() !== '');

    return (
        <>
            <Page
                title={pageTitle}
                room={MAILBOX_ROOM}
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
                    navigating={navigation.navigating}
                    count={
                        <span className="text-(length:--text-body) text-(--mailbox-ink-soft)">
                            {count(countAll, countNoun.one, countNoun.other)}
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
                            mode="nav"
                            keepScroll
                            ariaLabel={tabsAriaLabel}
                            active={tab}
                            items={tabItems}
                            hrefFor={tabHrefFor}
                        />
                    }
                />

                <CursorListBody
                    prop={propName}
                    items={paginator.data}
                    navigation={navigation}
                    query={query ?? ''}
                    noMatchesNoun={countNoun.other}
                    noMatchesBody="Try another word, or clear the search to see everything."
                    empty={
                        <EmptyState
                            icon={emptyIcon}
                            title={emptyTitle}
                            body={emptyBody}
                        />
                    }
                    renderItem={(item) => renderItem(item, focusedId)}
                    listClassName="mailbox-feed"
                />
            </Page>

            {children}
        </>
    );
}
