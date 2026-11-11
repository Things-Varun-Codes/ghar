import { Head } from '@inertiajs/react';
import { useState } from 'react';
import ActivityAddDialog from '@/MiniApps/Corner/Components/ActivityAddDialog';
import ListItemCard from '@/MiniApps/Corner/Components/ListItemCard';
import ListPage from '@/MiniApps/Corner/Components/ListPage';
import type { ItemPermissions } from '@/MiniApps/Corner/Hooks/useItemActions';
import CornerLayout from '@/MiniApps/Corner/Layouts/CornerLayout';
import { show } from '@/routes/apps/our-corner/activities';
import EmptyState from '@/Shell/Components/EmptyState';
import AppLayout from '@/Shell/Layouts/AppLayout';
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
        <AppLayout>
            <Head title="Activities" />
            <CornerLayout>
                <ListPage<ActivityItem>
                    title="Activities"
                    paginator={activities}
                    propName="activities"
                    counts={activities.counts}
                    filter={filter}
                    activeLabel="Todo"
                    doneLabel="Done"
                    addCtaLabel="Add an activity"
                    onOpenAddDialog={() => setAddOpen(true)}
                    query={q ?? ''}
                    searchPlaceholder="Search activities"
                    sort={sort}
                    sortItems={[
                        { key: 'recent', label: 'Recently added' },
                        { key: 'title', label: 'Title A–Z' },
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
                                        <a
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
                                            <p className="mx-0 mt-1 mb-0 text-[12px] text-[var(--corner-ink-soft,var(--corner-ink))]">
                                                Added by {activity.addedBy.name}
                                            </p>
                                        </a>
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
                            />
                        ),
                        active: (
                            <EmptyState
                                title="All done."
                                body="Nothing left to do. Suspicious."
                            />
                        ),
                        done: (
                            <EmptyState
                                title="Nothing done yet."
                                body="Check an activity off when you've done it."
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
        </AppLayout>
    );
}
