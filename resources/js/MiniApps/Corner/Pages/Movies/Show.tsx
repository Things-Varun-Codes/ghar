import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import DetailPage from '@/MiniApps/Corner/Components/DetailPage';
import type { MentionedInRef } from '@/MiniApps/Corner/Components/MentionedInList';
import MovieAddDialog from '@/MiniApps/Corner/Components/MovieAddDialog';
import PlexLink from '@/MiniApps/Corner/Components/PlexLink';
import type { ItemPermissions } from '@/MiniApps/Corner/Hooks/useItemActions';
import { useItemActions } from '@/MiniApps/Corner/Hooks/useItemActions';
import CornerLayout from '@/MiniApps/Corner/Layouts/CornerLayout';
import { index as moviesIndex } from '@/routes/apps/our-corner/movies';
import AppLayout from '@/Shell/Layouts/AppLayout';
import { entityIcon } from '@/Shell/linkables/entityIcon';

const MovieIcon = entityIcon('corner.movie');

type MovieDetail = {
    id: number;
    title: string;
    poster_url: string | null;
    plex_url: string | null;
    added_at: string;
    done_at: string | null;
    is_watched: boolean;
    can: ItemPermissions;
    addedBy: { id: number; name: string };
};

type Props = {
    movie: MovieDetail;
    mentioned_in: MentionedInRef[];
};

export default function MoviesShow({ movie, mentioned_in }: Props) {
    const [posterBroken, setPosterBroken] = useState(false);
    const [editOpen, setEditOpen] = useState(false);

    const itemActions = useItemActions({
        type: 'movies',
        id: movie.id,
        title: movie.title,
        onOpenEdit: () => setEditOpen(true),
        onDeleted: () => router.visit(moviesIndex.url()),
    });

    return (
        <AppLayout>
            <Head title={movie.title} />
            <CornerLayout>
                <DetailPage
                    title={movie.title}
                    can={movie.can}
                    addedByName={movie.addedBy.name}
                    mentionedIn={mentioned_in}
                    isDone={movie.is_watched}
                    doneLabel={{
                        active: 'Mark as watched',
                        done: 'Watched',
                    }}
                    itemActions={itemActions}
                    hero={() =>
                        movie.poster_url && !posterBroken ? (
                            <img
                                src={movie.poster_url}
                                alt=""
                                onError={() => setPosterBroken(true)}
                                className="corner-detail-poster corner-detail-hero-media"
                            />
                        ) : movie.poster_url && posterBroken ? (
                            <div
                                aria-hidden="true"
                                className="corner-detail-poster-fallback corner-detail-hero-media"
                            >
                                <MovieIcon
                                    size={48}
                                    strokeWidth={1.5}
                                    aria-hidden="true"
                                    className="corner-detail-fallback-icon"
                                />
                            </div>
                        ) : null
                    }
                    externalCta={() =>
                        movie.plex_url && <PlexLink href={movie.plex_url} />
                    }
                />

                {movie.can.update && editOpen && (
                    <MovieAddDialog
                        item={{
                            id: movie.id,
                            title: movie.title,
                            plex_url: movie.plex_url,
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
