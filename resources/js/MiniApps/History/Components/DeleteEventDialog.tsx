import { router } from '@inertiajs/react';
import { mutationOptions } from '@/lib/mutation';
import { HISTORY_CONFIRM_CLASSES } from '@/MiniApps/History/lib/confirmDialog';
import events from '@/routes/apps/our-history/events';
import ConfirmDialog from '@/Shell/Components/ConfirmDialog';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    eventId: number;
    onDeleted?: () => void;
};

export default function DeleteEventDialog({
    open,
    onOpenChange,
    eventId,
    onDeleted,
}: Props) {
    function handleDelete() {
        router.delete(events.destroy(eventId).url, {
            onSuccess: () => {
                onOpenChange(false);
                onDeleted?.();
            },
            ...mutationOptions({
                component: 'History/DeleteEventDialog',
                action: 'event.delete',
                message: "Couldn't delete this moment. Try again.",
            }),
        });
    }

    return (
        <ConfirmDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Delete this moment?"
            description="This removes the moment and its photos and videos. There's no undo."
            cancelLabel="Keep it"
            confirmLabel="Delete moment"
            variant="destructive"
            onConfirm={handleDelete}
            classNames={{
                ...HISTORY_CONFIRM_CLASSES,
                cancel: 'history-btn-keep-event h-auto shadow-none',
            }}
        />
    );
}
