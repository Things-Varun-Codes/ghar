import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import ActivityAddDialog from '@/MiniApps/Corner/Components/ActivityAddDialog';
import DetailPage from '@/MiniApps/Corner/Components/DetailPage';
import type { MentionedInRef } from '@/MiniApps/Corner/Components/MentionedInList';
import type { ItemPermissions } from '@/MiniApps/Corner/Hooks/useItemActions';
import { useItemActions } from '@/MiniApps/Corner/Hooks/useItemActions';
import CornerLayout from '@/MiniApps/Corner/Layouts/CornerLayout';
import { index as activitiesIndex } from '@/routes/apps/our-corner/activities';
import AppLayout from '@/Shell/Layouts/AppLayout';

type ActivityDetail = {
    id: number;
    title: string;
    notes: string | null;
    added_at: string;
    done_at: string | null;
    is_done: boolean;
    can: ItemPermissions;
    addedBy: { id: number; name: string };
};

type Props = {
    activity: ActivityDetail;
    mentioned_in: MentionedInRef[];
};

export default function ActivitiesShow({ activity, mentioned_in }: Props) {
    const [editOpen, setEditOpen] = useState(false);

    const itemActions = useItemActions({
        type: 'activities',
        id: activity.id,
        title: activity.title,
        onOpenEdit: () => setEditOpen(true),
        onDeleted: () => router.visit(activitiesIndex.url()),
    });

    return (
        <AppLayout>
            <Head title={activity.title} />
            <CornerLayout>
                <DetailPage
                    title={activity.title}
                    can={activity.can}
                    addedByName={activity.addedBy.name}
                    mentionedIn={mentioned_in}
                    isDone={activity.is_done}
                    doneLabel={{ active: 'Mark as done', done: 'Done' }}
                    itemActions={itemActions}
                    body={() =>
                        activity.notes && (
                            <p className="corner-detail-notes">
                                {activity.notes}
                            </p>
                        )
                    }
                />

                {activity.can.update && editOpen && (
                    <ActivityAddDialog
                        item={{
                            id: activity.id,
                            title: activity.title,
                            notes: activity.notes,
                        }}
                        open
                        onOpenChange={(next) => {
                            if (!next) {
                                setEditOpen(false);
                            }
                        }}
                    />
                )}
            </CornerLayout>
        </AppLayout>
    );
}
