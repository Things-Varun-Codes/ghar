import { router, usePage } from '@inertiajs/react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { Play, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAppAttrs } from '@/hooks/use-app-attrs';
import { transportFailureOptions } from '@/lib/mutation';
import { captureSilent } from '@/lib/observability';
import media from '@/routes/apps/our-history/media';
import type { Auth } from '@/types/auth';
import type { MediaItem } from './MediaGrid';

type CurrentMediaStripProps = {
    eventId: number;
    media: MediaItem[];
    onDeleted: (mediaId: number) => void;
};

export default function CurrentMediaStrip({
    eventId,
    media: mediaItems,
    onDeleted,
}: CurrentMediaStripProps) {
    const appAttrs = useAppAttrs();
    const { auth } = usePage<{ auth: Auth }>().props;
    const userRole: 'admin' | 'user' | 'guest' = auth.user
        ? auth.user.roles?.[0] === 'admin'
            ? 'admin'
            : 'user'
        : 'guest';

    const [deletingId, setDeletingId] = useState<number | null>(null);

    const deletingItem = mediaItems.find((m) => m.id === deletingId) ?? null;

    if (mediaItems.length === 0) {
        return null;
    }

    function handleConfirm() {
        if (deletingId === null) {
            return;
        }

        const idToDelete = deletingId;
        router.delete(
            media.destroy({ event: eventId, media: idToDelete }).url,
            {
                preserveScroll: true,
                ...transportFailureOptions({
                    component: 'History/CurrentMediaStrip',
                    action: 'media.delete',
                    message: "Couldn't remove that. Give it another go.",
                }),
                onSuccess: () => {
                    onDeleted(idToDelete);
                },
                onError: (errors) => {
                    captureSilent(new Error('media.delete failed'), {
                        component: 'History/CurrentMediaStrip',
                        action: 'media.delete',
                        surface: 'frontend',
                        user_role: userRole,
                        extra: {
                            payload: { eventId, mediaId: idToDelete, errors },
                            http_status: 422,
                        },
                    });
                    toast.error("Couldn't remove that. Give it another go.");
                },
                onFinish: () => {
                    setDeletingId(null);
                },
            },
        );
    }

    return (
        <div className="mb-4">
            <label className="history-media-label">
                Current photos &amp; videos
            </label>

            <div className="grid grid-cols-[repeat(3,1fr)] gap-2">
                {mediaItems.map((item, idx) => (
                    <div key={item.id} className="history-media-thumb">
                        {item.thumb ? (
                            <img
                                src={item.thumb}
                                alt=""
                                loading="lazy"
                                decoding="async"
                                className="block h-full w-full object-cover"
                            />
                        ) : item.poster ? (
                            <img
                                src={item.poster}
                                alt=""
                                loading="lazy"
                                decoding="async"
                                className="block h-full w-full object-cover"
                            />
                        ) : null}

                        {item.kind === 'video' && (
                            <span
                                aria-hidden="true"
                                className="history-play-badge"
                            >
                                <Play
                                    size={16}
                                    strokeWidth={1.5}
                                    fill="currentColor"
                                />
                            </span>
                        )}

                        <button
                            type="button"
                            onClick={() => setDeletingId(item.id)}
                            aria-label={`Remove ${item.kind === 'video' ? 'video' : 'photo'} ${idx + 1} of ${mediaItems.length}`}
                            className="history-media-remove-hit"
                        >
                            <span
                                aria-hidden="true"
                                className="history-media-remove-dot"
                            >
                                <X size={16} strokeWidth={1.5} />
                            </span>
                        </button>
                    </div>
                ))}
            </div>

            <AlertDialogPrimitive.Root
                open={deletingId !== null}
                onOpenChange={(next) => {
                    if (!next) {
                        setDeletingId(null);
                    }
                }}
            >
                <AlertDialogPrimitive.Portal>
                    <AlertDialogPrimitive.Overlay
                        className="history-alert-overlay"
                        {...appAttrs}
                    />
                    <AlertDialogPrimitive.Content
                        {...appAttrs}
                        className="history-alert-dialog"
                    >
                        <AlertDialogPrimitive.Title className="history-alert-title">
                            Delete this{' '}
                            {deletingItem?.kind === 'video' ? 'video' : 'photo'}
                            ?
                        </AlertDialogPrimitive.Title>
                        <AlertDialogPrimitive.Description className="history-alert-body">
                            This removes it from the moment. There's no undo.
                        </AlertDialogPrimitive.Description>
                        <div className="flex justify-end gap-3">
                            <AlertDialogPrimitive.Cancel asChild>
                                <button
                                    type="button"
                                    className="history-btn-keep-media"
                                >
                                    Keep
                                </button>
                            </AlertDialogPrimitive.Cancel>

                            <AlertDialogPrimitive.Action asChild>
                                <button
                                    type="button"
                                    onClick={handleConfirm}
                                    className="history-btn-destructive"
                                >
                                    Yes, delete
                                </button>
                            </AlertDialogPrimitive.Action>
                        </div>
                    </AlertDialogPrimitive.Content>
                </AlertDialogPrimitive.Portal>
            </AlertDialogPrimitive.Root>
        </div>
    );
}
