import { router } from '@inertiajs/react';
import { Play, X } from 'lucide-react';
import { useState } from 'react';
import { mutationOptions } from '@/lib/mutation';
import { HISTORY_CONFIRM_CLASSES } from '@/MiniApps/History/lib/confirmDialog';
import media from '@/routes/apps/our-history/media';
import ConfirmDialog from '@/Shell/Components/ConfirmDialog';
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
                ...mutationOptions({
                    component: 'History/CurrentMediaStrip',
                    action: 'media.delete',
                    message: "Couldn't remove that file. Try again.",
                }),
                onSuccess: () => {
                    onDeleted(idToDelete);
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

            <ConfirmDialog
                open={deletingId !== null}
                onOpenChange={(next) => {
                    if (!next) {
                        setDeletingId(null);
                    }
                }}
                title={`Delete this ${deletingItem?.kind === 'video' ? 'video' : 'photo'}?`}
                description="This removes it from the moment. There's no undo."
                cancelLabel="Keep"
                confirmLabel="Yes, delete"
                variant="destructive"
                onConfirm={handleConfirm}
                classNames={{
                    ...HISTORY_CONFIRM_CLASSES,
                    cancel: 'history-btn-keep-media h-auto shadow-none',
                }}
            />
        </div>
    );
}
