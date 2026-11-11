import { Head } from '@inertiajs/react';
import { useState } from 'react';
import ListPage from '@/MiniApps/Corner/Components/ListPage';
import MovieAddDialog from '@/MiniApps/Corner/Components/MovieAddDialog';
import MovieTile from '@/MiniApps/Corner/Components/MovieTile';
import type { ItemPermissions } from '@/MiniApps/Corner/Hooks/useItemActions';
import CornerLayout from '@/MiniApps/Corner/Layouts/CornerLayout';
import EmptyState from '@/Shell/Components/EmptyState';
import AppLayout from '@/Shell/Layouts/AppLayout';
import type { Paginated } from '@/types/paginated';

type MovieItem = {
    id: number;
    title: string;
    poster_url: string | null;
    plex_url: string | null;
    added_at: string;
    done_at: string | null;
    is_watched: boolean;
    can: ItemPermissions;
    added_by_user_id: number;
    addedBy: { id: number; name: string };
};

type Props = {
    movies: Paginated<MovieItem> & {
        counts: { all: number; active: number; done: number };
    };
    filter: 'all' | 'active' | 'done';
    sort: 'recent' | 'title';
    q: string | null;
};

export default function MoviesIndex({ movies, filter, sort, q }: Props) {
    const [addOpen, setAddOpen] = useState(false);
    const [editMovie, setEditMovie] = useState<MovieItem | null>(null);

    return (
        <AppLayout>
            <Head title="Movies" />
            <CornerLayout>
                <ListPage<MovieItem>
                    title="Movies"
                    paginator={movies}
                    propName="movies"
                    counts={movies.counts}
                    filter={filter}
                    activeLabel="Watchlist"
                    doneLabel="Watched"
                    addCtaLabel="Add a movie"
                    // "Movies" → "movie" (the default /ies$/→y singularizer would
                    // mangle it to "movy"; it's a plain movie+s plural).
                    singularNoun="movie"
                    onOpenAddDialog={() => setAddOpen(true)}
                    layout="tiles"
                    query={q ?? ''}
                    searchPlaceholder="Search movies"
                    sort={sort}
                    sortItems={[
                        { key: 'recent', label: 'Recently added' },
                        { key: 'title', label: 'Title A–Z' },
                    ]}
                    renderItem={(movie) => (
                        <MovieTile
                            listType="movies"
                            movie={movie}
                            onEdit={
                                movie.can.update
                                    ? () => setEditMovie(movie)
                                    : undefined
                            }
                        />
                    )}
                    emptyState={{
                        all: (
                            <EmptyState
                                title="No movies yet."
                                body="Add something worth watching."
                            />
                        ),
                        active: (
                            <EmptyState
                                title="All watched."
                                body="Nothing left on the watchlist."
                            />
                        ),
                        done: (
                            <EmptyState
                                title="Nothing watched yet."
                                body="Mark a movie once you've seen it."
                            />
                        ),
                    }}
                />

                <MovieAddDialog open={addOpen} onOpenChange={setAddOpen} />

                {editMovie && (
                    <MovieAddDialog
                        key={editMovie.id}
                        item={{
                            id: editMovie.id,
                            title: editMovie.title,
                            plex_url: editMovie.plex_url,
                        }}
                        open
                        onOpenChange={(next) => {
                            if (!next) {
                                setEditMovie(null);
                            }
                        }}
                    />
                )}
            </CornerLayout>
        </AppLayout>
    );
}
