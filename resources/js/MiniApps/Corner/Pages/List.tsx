import { Button } from '@/components/ui/button';
import ItemCard from '@/MiniApps/Corner/Components/ItemCard';
import ItemSheet from '@/MiniApps/Corner/Components/ItemSheet';
import ListMenu from '@/MiniApps/Corner/Components/ListMenu';
import ListPage from '@/MiniApps/Corner/Components/ListPage';
import { useSheetSession } from '@/MiniApps/Corner/Hooks/useSheetSession';
import CornerLayout from '@/MiniApps/Corner/Layouts/CornerLayout';
import type { CornerItem, CornerListInfo } from '@/MiniApps/Corner/lib/types';
import EmptyState from '@/Shell/Components/EmptyState';
import type { SortItem } from '@/Shell/Components/ListNavBand';
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
    const adding = useSheetSession<true>();
    const editing = useSheetSession<CornerItem>();
    const addLabel = `Add to ${list.name}`;

    const sortItems: SortItem[] = sorts.map((key) => ({
        key,
        label: SORT_LABELS[key] ?? key,
    }));

    return (
        <CornerLayout>
            <ListPage
                // A list's own key: moving between two lists keeps nothing of the other.
                key={list.id}
                list={list}
                paginator={items}
                counts={items.counts}
                filter={filter}
                query={q ?? ''}
                sort={sort}
                sortItems={sortItems}
                addLabel={addLabel}
                onAdd={() => adding.show(true)}
                actions={<ListMenu list={list} count={items.counts.all} />}
                renderItem={(item) => {
                    const onEdit = item.can.update
                        ? () => editing.show(item)
                        : undefined;

                    return (
                        <ItemCard
                            list={list}
                            item={item}
                            onEdit={onEdit}
                            onTodoTab={filter === 'active'}
                        />
                    );
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
                                    onClick={() => adding.show(true)}
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

            {adding.value && (
                <ItemSheet
                    key={adding.key}
                    list={list}
                    open={adding.open}
                    onOpenChange={adding.onOpenChange}
                />
            )}

            {editing.value && (
                <ItemSheet
                    key={editing.key}
                    list={list}
                    item={editing.value}
                    open={editing.open}
                    onOpenChange={editing.onOpenChange}
                />
            )}
        </CornerLayout>
    );
}
