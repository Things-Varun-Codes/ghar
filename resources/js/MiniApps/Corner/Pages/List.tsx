import { useState } from 'react';
import { Button } from '@/components/ui/button';
import ItemCard from '@/MiniApps/Corner/Components/ItemCard';
import ItemSheet from '@/MiniApps/Corner/Components/ItemSheet';
import ListMenu from '@/MiniApps/Corner/Components/ListMenu';
import ListPage from '@/MiniApps/Corner/Components/ListPage';
import CornerLayout from '@/MiniApps/Corner/Layouts/CornerLayout';
import type { CornerItem, CornerListInfo } from '@/MiniApps/Corner/lib/types';
import EmptyState from '@/Shell/Components/EmptyState';
import type { SortItem } from '@/Shell/Components/ListSortControl';
import type { Paginated } from '@/types/paginated';

type Props = {
    list: CornerListInfo;
    items: Paginated<CornerItem> & {
        counts: { all: number; active: number; done: number };
    };
    filter: 'all' | 'active' | 'done';
    sort: string;
    sorts: string[];
    q: string | null;
};

const SORT_LABELS: Record<string, string> = {
    recent: 'Recently added',
    title: 'A to Z',
};

export default function List({ list, items, filter, sort, sorts, q }: Props) {
    const [addOpen, setAddOpen] = useState(false);
    const [editing, setEditing] = useState<CornerItem | null>(null);
    const addLabel = `Add to ${list.name}`;

    const sortItems: SortItem[] = sorts.map((key) => ({
        key,
        label: SORT_LABELS[key] ?? key,
    }));

    return (
        <CornerLayout>
            <ListPage<CornerItem>
                // A list's own key: moving between two lists keeps nothing of the other.
                key={list.id}
                title={list.name}
                paginator={items}
                propName="items"
                counts={items.counts}
                filter={filter}
                activeLabel={list.todo_label}
                doneLabel={list.done_label}
                addCtaLabel={addLabel}
                onOpenAddDialog={() => setAddOpen(true)}
                query={q ?? ''}
                searchPlaceholder={
                    list.name.length <= 20
                        ? `Search ${list.name}`
                        : 'Search this list'
                }
                sort={sort}
                sortItems={sortItems}
                actions={<ListMenu list={list} count={items.counts.all} />}
                renderItem={(item) => {
                    const onEdit = item.can.update
                        ? () => setEditing(item)
                        : undefined;

                    return <ItemCard list={list} item={item} onEdit={onEdit} />;
                }}
                emptyState={{
                    all: (
                        <EmptyState
                            title={`Nothing in ${list.name} yet.`}
                            body="Add the first one: a name is enough, and a pasted link brings its own."
                            action={
                                <Button
                                    type="button"
                                    className="shell-press"
                                    onClick={() => setAddOpen(true)}
                                >
                                    {addLabel}
                                </Button>
                            }
                        />
                    ),
                    active: (
                        <EmptyState
                            title="Nothing left to get to."
                            body="Everything here is done. Add another?"
                        />
                    ),
                    done: (
                        <EmptyState
                            title={`Nothing marked “${list.done_label}” yet.`}
                            body={`Tap the ${list.done_icon === 'heart' ? 'heart' : 'tick'} on one once you get to it.`}
                        />
                    ),
                }}
            />

            {addOpen && (
                <ItemSheet
                    list={list}
                    open
                    onOpenChange={(next) => {
                        if (!next) {
                            setAddOpen(false);
                        }
                    }}
                />
            )}

            {editing && (
                <ItemSheet
                    key={editing.id}
                    list={list}
                    item={editing}
                    open
                    onOpenChange={(next) => {
                        if (!next) {
                            setEditing(null);
                        }
                    }}
                />
            )}
        </CornerLayout>
    );
}
