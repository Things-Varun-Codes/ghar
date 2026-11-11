import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import DetailPage from '@/MiniApps/Corner/Components/DetailPage';
import type { MentionedInRef } from '@/MiniApps/Corner/Components/MentionedInList';
import SongAddDialog from '@/MiniApps/Corner/Components/SongAddDialog';
import type { ItemPermissions } from '@/MiniApps/Corner/Hooks/useItemActions';
import { useItemActions } from '@/MiniApps/Corner/Hooks/useItemActions';
import CornerLayout from '@/MiniApps/Corner/Layouts/CornerLayout';
import { index as songsIndex } from '@/routes/apps/our-corner/songs';
import AppLayout from '@/Shell/Layouts/AppLayout';
import { entityIcon } from '@/Shell/linkables/entityIcon';

const SongIcon = entityIcon('corner.song');

type SongDetail = {
    id: number;
    provider: string;
    title: string;
    author: string | null;
    url: string;
    thumbnail_url: string | null;
    added_at: string;
    done_at: string | null;
    is_loved: boolean;
    can: ItemPermissions;
    addedBy: { id: number; name: string };
};

type Props = {
    song: SongDetail;
    mentioned_in: MentionedInRef[];
};

function providerLabel(provider: string): string {
    if (provider === 'youtube') {
        return 'Open in YouTube';
    }

    if (provider === 'spotify') {
        return 'Open in Spotify';
    }

    return 'Open link';
}

export default function SongsShow({ song, mentioned_in }: Props) {
    const [thumbnailBroken, setThumbnailBroken] = useState(false);
    const [editOpen, setEditOpen] = useState(false);

    const itemActions = useItemActions({
        type: 'songs',
        id: song.id,
        title: song.title,
        onOpenEdit: () => setEditOpen(true),
        onDeleted: () => router.visit(songsIndex.url()),
    });

    return (
        <AppLayout>
            <Head title={song.title} />
            <CornerLayout>
                <DetailPage
                    title={song.title}
                    can={song.can}
                    addedByName={song.addedBy.name}
                    metaSuffix={providerLabel(song.provider).replace(
                        /^Open in /,
                        '',
                    )}
                    mentionedIn={mentioned_in}
                    isDone={song.is_loved}
                    doneIcon="heart"
                    doneLabel={{ active: 'Love', done: 'Loved' }}
                    itemActions={itemActions}
                    hero={() => (
                        <div className="corner-cd corner-cd--lg corner-detail-hero-media">
                            {song.thumbnail_url && !thumbnailBroken ? (
                                <img
                                    src={song.thumbnail_url}
                                    alt=""
                                    className="corner-cd-cover"
                                    onError={() => setThumbnailBroken(true)}
                                />
                            ) : (
                                <div
                                    className="corner-cd-fallback"
                                    aria-hidden="true"
                                >
                                    <SongIcon
                                        size={48}
                                        strokeWidth={1.5}
                                        className="corner-detail-fallback-icon"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                    body={() =>
                        song.author && (
                            <p className="corner-detail-lede">{song.author}</p>
                        )
                    }
                    externalCta={() => (
                        <a
                            href={song.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="corner-detail-cta"
                        >
                            {providerLabel(song.provider)} ↗
                        </a>
                    )}
                />

                {song.can.update && editOpen && (
                    <SongAddDialog
                        item={{ id: song.id, url: song.url }}
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
