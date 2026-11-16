import { Link } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import ActivityAddDialog from '@/MiniApps/Corner/Components/ActivityAddDialog';
import ListItemCard from '@/MiniApps/Corner/Components/ListItemCard';
import ListPage from '@/MiniApps/Corner/Components/ListPage';
import type { ItemPermissions } from '@/MiniApps/Corner/Hooks/useItemActions';
import CornerLayout from '@/MiniApps/Corner/Layouts/CornerLayout';
import { show } from '@/routes/apps/our-corner/activities';
import EmptyState from '@/Shell/Components/EmptyState';
import type { Paginated } from '@/types/paginated';

type ActivityItem = {
    id: number;
    title: string;
    notes: string | null;
    added_at: string;
    done_at: string | null;
    is_done: boolean;
    can: ItemPermissions;
    added_by_user_id: number;
    addedBy: { id: number; name: string };
};

type Props = {
    activities: Paginated<ActivityItem> & {
        counts: { all: number; active: number; done: number };
    };
    filter: 'all' | 'active' | 'done';
    sort: 'recent' | 'title';
    q: string | null;
};

function notesPreview(notes: string | null): string | null {
    if (!notes) {
        return null;
    }

    const firstLine = notes.split('\n')[0].trim();

    if (firstLine.length === 0) {
        return null;
    }

    return firstLine.length > 80
        ? `${firstLine.slice(0, 80).trim()}…`
        : firstLine;
}

export default function ActivitiesIndex({
    activities,
    filter,
    sort,
    q,
}: Props) {
    const [addOpen, setAddOpen] = useState(false);
    const [editActivity, setEditActivity] = useState<ActivityItem | null>(null);

    return (
        <CornerLayout>
            <ListPage<ActivityItem>
                title="Activities"
                paginator={activities}
                propName="activities"
                counts={activities.counts}
                filter={filter}
                activeLabel="To do"
                doneLabel="Done"
                addCtaLabel="Add an activity"
                onOpenAddDialog={() => setAddOpen(true)}
                query={q ?? ''}
                searchPlaceholder="Search activities"
                sort={sort}
                sortItems={[
                    { key: 'recent', label: 'Recently added' },
                    { key: 'title', label: 'Title A to Z' },
                ]}
                renderItem={(activity) => {
                    const preview = notesPreview(activity.notes);

                    return (
                        <ListItemCard<ActivityItem>
                            listType="activities"
                            item={activity}
                            can={activity.can}
                            onEdit={
                                activity.can.update
                                    ? () => setEditActivity(activity)
                                    : undefined
                            }
                            renderMain={() => {
                                const isDone = activity.done_at !== null;
                                const detailHref = show.url(activity.id);

                                return (
                                    <Link
                                        href={detailHref}
                                        className="shell-card-link block min-w-0 flex-1 text-inherit no-underline"
                                    >
                                        <span className="corner-row-title">
                                            {activity.title}
                                            {isDone && (
                                                <span className="corner-sticker corner-sticker--inline">
                                                    Did it
                                                </span>
                                            )}
                                        </span>
                                        {preview && (
                                            <p className="corner-activity-preview">
                                                {preview}
                                            </p>
                                        )}
                                        <p className="corner-row-meta">
                                            Added by {activity.addedBy.name}
                                        </p>
                                    </Link>
                                );
                            }}
                        />
                    );
                }}
                emptyState={{
                    all: (
                        <EmptyState
                            title="No activities yet."
                            body="Add something to do."
                            action={
                                <Button
                                    type="button"
                                    className="shell-press"
                                    onClick={() => setAddOpen(true)}
                                >
                                    Add an activity
                                </Button>
                            }
                        />
                    ),
                    active: (
                        <EmptyState
                            title="All done."
                            body="That's everything done. What's next?"
                        />
                    ),
                    done: (
                        <EmptyState
                            title="Nothing done yet."
                            body="Activities you mark as done show up here."
                        />
                    ),
                }}
            />

            <ActivityAddDialog open={addOpen} onOpenChange={setAddOpen} />

            {editActivity && (
                <ActivityAddDialog
                    key={editActivity.id}
                    item={{
                        id: editActivity.id,
                        title: editActivity.title,
                        notes: editActivity.notes,
                    }}
                    open
                    onOpenChange={(next) => {
                        if (!next) {
                            setEditActivity(null);
                        }
                    }}
                />
            )}
        </CornerLayout>
    );
}
