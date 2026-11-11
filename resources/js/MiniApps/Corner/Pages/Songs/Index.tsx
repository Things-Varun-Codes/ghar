import { Head } from '@inertiajs/react';
import { useState } from 'react';
import ListPage from '@/MiniApps/Corner/Components/ListPage';
import SongAddDialog from '@/MiniApps/Corner/Components/SongAddDialog';
import SongTile from '@/MiniApps/Corner/Components/SongTile';
import type { ItemPermissions } from '@/MiniApps/Corner/Hooks/useItemActions';
import CornerLayout from '@/MiniApps/Corner/Layouts/CornerLayout';
import EmptyState from '@/Shell/Components/EmptyState';
import AppLayout from '@/Shell/Layouts/AppLayout';
import type { Paginated } from '@/types/paginated';

type SongItem = {
    id: number;
    provider: string;
    provider_id: string;
    title: string;
    author: string | null;
    url: string;
    thumbnail_url: string | null;
    added_at: string;
    done_at: string | null;
    is_loved: boolean;
    can: ItemPermissions;
    added_by_user_id: number;
    addedBy: { id: number; name: string };
};

type Props = {
    songs: Paginated<SongItem> & {
        counts: { all: number; active: number; done: number };
    };
    filter: 'all' | 'active' | 'done';
    sort: 'recent' | 'title' | 'artist';
    q: string | null;
};

export default function SongsIndex({ songs, filter, sort, q }: Props) {
    const [addOpen, setAddOpen] = useState(false);
    const [editSong, setEditSong] = useState<SongItem | null>(null);

    return (
        <AppLayout>
            <Head title="Songs" />
            <CornerLayout>
                <ListPage<SongItem>
                    title="Songs"
                    paginator={songs}
                    propName="songs"
                    counts={songs.counts}
                    filter={filter}
                    activeLabel="Playlist"
                    doneLabel="Loved"
                    addCtaLabel="Add a song"
                    onOpenAddDialog={() => setAddOpen(true)}
                    layout="tiles"
                    query={q ?? ''}
                    searchPlaceholder="Search songs"
                    sort={sort}
                    sortItems={[
                        { key: 'recent', label: 'Recently added' },
                        { key: 'title', label: 'Title A–Z' },
                        { key: 'artist', label: 'Artist A–Z' },
                    ]}
                    renderItem={(song) => (
                        <SongTile
                            listType="songs"
                            song={song}
                            onEdit={
                                song.can.update
                                    ? () => setEditSong(song)
                                    : undefined
                            }
                        />
                    )}
                    emptyState={{
                        all: (
                            <EmptyState
                                title="No songs yet."
                                body="Paste a YouTube or Spotify link to add your first."
                            />
                        ),
                        active: (
                            <EmptyState
                                title="All loved."
                                body="Nothing left in the active playlist."
                            />
                        ),
                        done: (
                            <EmptyState
                                title="No loved songs yet."
                                body="Tap the heart on a song you love."
                            />
                        ),
                    }}
                />

                <SongAddDialog open={addOpen} onOpenChange={setAddOpen} />

                {editSong && (
                    <SongAddDialog
                        key={editSong.id}
                        item={{ id: editSong.id, url: editSong.url }}
                        open
                        onOpenChange={(next) => {
                            if (!next) {
                                setEditSong(null);
                            }
                        }}
                    />
                )}
            </CornerLayout>
        </AppLayout>
    );
}
