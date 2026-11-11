import { CheckCircle2, Circle, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Toggle } from '@/components/ui/toggle';
import { useMenuAction } from '@/hooks/use-menu-action';
import PlexLink from '@/MiniApps/Corner/Components/PlexLink';
import type { ItemPermissions } from '@/MiniApps/Corner/Hooks/useItemActions';
import type { CornerItemType } from '@/MiniApps/Corner/Hooks/useItemActions';
import { useItemActions } from '@/MiniApps/Corner/Hooks/useItemActions';
import { show } from '@/routes/apps/our-corner/movies';
import AppCard from '@/Shell/Components/AppCard';
import { entityIcon } from '@/Shell/linkables/entityIcon';

const MovieIcon = entityIcon('corner.movie');

type MovieItem = {
    id: number;
    title: string;
    poster_url: string | null;
    plex_url: string | null;
    done_at: string | null;
    can: ItemPermissions;
    added_by_user_id: number;
    addedBy: { id: number; name: string };
};

type Props = {
    movie: MovieItem;
    listType: CornerItemType;
    onEdit?: () => void;
};

export default function MovieTile({ movie, listType, onEdit }: Props) {
    const [posterBroken, setPosterBroken] = useState(false);
    const menu = useMenuAction();

    const isDone = movie.done_at !== null;
    const detailHref = show.url(movie.id);

    const { isPendingDelete, handleEdit, handleToggleDone, handleDelete } =
        useItemActions({
            type: listType,
            id: movie.id,
            title: movie.title,
            onOpenEdit: onEdit,
        });

    if (isPendingDelete) {
        return null;
    }

    const canManage = movie.can.update || movie.can.delete;

    return (
        <AppCard
            variant="list"
            data-app="our-corner"
            className="shell-card-stretch"
        >
            <a
                href={detailHref}
                className="shell-card-link block text-inherit no-underline"
            >
                <div className="corner-poster">
                    {isDone && <span className="corner-sticker">Watched</span>}
                    {movie.poster_url && !posterBroken ? (
                        <img
                            src={movie.poster_url}
                            alt=""
                            className="corner-poster-cover"
                            onError={() => setPosterBroken(true)}
                        />
                    ) : (
                        <div
                            className="corner-poster-fallback"
                            aria-hidden="true"
                        >
                            <MovieIcon
                                size={32}
                                strokeWidth={1.5}
                                className="text-(--corner-accent)"
                            />
                        </div>
                    )}
                </div>

                <span className="corner-tile-title">{movie.title}</span>

                <span className="corner-tile-meta">
                    Added by {movie.addedBy.name}
                </span>
            </a>

            <div className="mt-2 flex items-center justify-between">
                {movie.plex_url ? (
                    <PlexLink href={movie.plex_url} />
                ) : (
                    <span className="w-[40px] shrink-0" />
                )}

                <Toggle
                    className="corner-done-toggle corner-done-toggle--icon"
                    pressed={isDone}
                    onPressedChange={handleToggleDone}
                    aria-label={
                        isDone ? 'Unmark as watched' : 'Mark as watched'
                    }
                    title={isDone ? 'Unmark as watched' : 'Mark as watched'}
                >
                    {isDone ? (
                        <CheckCircle2 aria-hidden="true" />
                    ) : (
                        <Circle aria-hidden="true" />
                    )}
                </Toggle>

                {!canManage && <span aria-hidden="true" className="w-[40px]" />}

                {canManage && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                aria-label="Item actions"
                                className="corner-tile-icon-btn"
                            >
                                <MoreHorizontal size={18} aria-hidden="true" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            onCloseAutoFocus={menu.onCloseAutoFocus}
                            align="end"
                            data-app="our-corner"
                        >
                            {onEdit && movie.can.update && (
                                <DropdownMenuItem
                                    onSelect={menu.defer(handleEdit)}
                                >
                                    Edit
                                </DropdownMenuItem>
                            )}
                            {movie.can.delete && (
                                <DropdownMenuItem
                                    variant="destructive"
                                    onSelect={menu.defer(handleDelete)}
                                >
                                    Delete
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </AppCard>
    );
}
