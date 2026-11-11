import { router, usePage } from '@inertiajs/react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useThemeAttrs } from '@/hooks/use-theme-attrs';
import { captureSilent } from '@/lib/observability';
import events from '@/routes/apps/our-history/events';
import type { Auth } from '@/types/auth';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    eventId: number;
    onDeleting?: (deleting: boolean) => void;
    onDeleted?: () => void;
};

export default function DeleteEventDialog({
    open,
    onOpenChange,
    eventId,
    onDeleting,
    onDeleted,
}: Props) {
    const themeAttrs = useThemeAttrs();
    const { auth } = usePage<{ auth: Auth }>().props;
    const userRole: 'admin' | 'user' | 'guest' = auth.user
        ? auth.user.roles?.[0] === 'admin'
            ? 'admin'
            : 'user'
        : 'guest';

    function handleDelete() {
        onDeleting?.(true);
        router.delete(events.destroy(eventId).url, {
            onSuccess: () => {
                onOpenChange(false);
                onDeleted?.();
            },
            onError: (errors) => {
                captureSilent(new Error('event.delete failed'), {
                    component: 'History/DeleteEventDialog',
                    action: 'event.delete',
                    surface: 'frontend',
                    user_role: userRole,
                    extra: {
                        payload: { eventId, errors },
                        http_status: 422,
                    },
                });
                onOpenChange(false);
                toast.error("Couldn't delete that. Give it another go.");
            },
            onFinish: () => {
                onDeleting?.(false);
            },
        });
    }

    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay
                    className="history-delete-overlay"
                    {...themeAttrs}
                />
                <DialogPrimitive.Content
                    {...themeAttrs}
                    className="history-delete-dialog"
                >
                    <DialogPrimitive.Title className="history-delete-title">
                        Delete this moment?
                    </DialogPrimitive.Title>
                    <DialogPrimitive.Description className="history-delete-body">
                        This removes the moment and its photos. There's no undo.
                    </DialogPrimitive.Description>

                    <div className="flex justify-end gap-3">
                        <DialogPrimitive.Close asChild>
                            <Button
                                type="button"
                                variant="outline"
                                className="history-btn-keep-event h-auto shadow-none"
                            >
                                Keep it
                            </Button>
                        </DialogPrimitive.Close>

                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDelete}
                            className="history-btn-destructive h-auto shadow-none"
                        >
                            Delete moment
                        </Button>
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
