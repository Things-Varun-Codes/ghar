import { MoreHorizontal } from 'lucide-react';
import { useState } from 'react';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Toggle } from '@/components/ui/toggle';
import { useMenuAction } from '@/hooks/use-menu-action';
import type { ItemPermissions } from '@/MiniApps/Corner/Hooks/useItemActions';
import type { CornerItemType } from '@/MiniApps/Corner/Hooks/useItemActions';
import { useItemActions } from '@/MiniApps/Corner/Hooks/useItemActions';
import { show } from '@/routes/apps/our-corner/songs';
import AppCard from '@/Shell/Components/AppCard';
import HeartMark from '@/Shell/Components/HeartMark';
import { entityIcon } from '@/Shell/linkables/entityIcon';

const SongIcon = entityIcon('corner.song');

type SongItem = {
    id: number;
    provider: string;
    title: string;
    author: string | null;
    url: string;
    thumbnail_url: string | null;
    done_at: string | null;
    can: ItemPermissions;
    added_by_user_id: number;
};

type Props = {
    song: SongItem;
    listType: CornerItemType;
    onEdit?: () => void;
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

// Real brand colours: a third-party mark isn't app chrome.
function ProviderIcon({ provider }: { provider: string }) {
    if (provider === 'spotify') {
        return (
            <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="#1DB954"
                aria-hidden="true"
            >
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
        );
    }

    return (
        <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="#FF0000"
            aria-hidden="true"
        >
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
    );
}

export default function SongTile({ song, listType, onEdit }: Props) {
    const [thumbnailBroken, setThumbnailBroken] = useState(false);
    const menu = useMenuAction();

    const isDone = song.done_at !== null;
    const detailHref = show.url(song.id);

    const { isPendingDelete, handleEdit, handleToggleDone, handleDelete } =
        useItemActions({
            type: listType,
            id: song.id,
            title: song.title,
            onOpenEdit: onEdit,
        });

    if (isPendingDelete) {
        return null;
    }

    const canManage = song.can.update || song.can.delete;

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
                <div className="corner-cd">
                    {isDone && (
                        <span className="corner-sticker">
                            <HeartMark size={12} filled />
                            Loved
                        </span>
                    )}
                    {song.thumbnail_url && !thumbnailBroken ? (
                        <img
                            src={song.thumbnail_url}
                            alt=""
                            className="corner-cd-cover"
                            onError={() => setThumbnailBroken(true)}
                        />
                    ) : (
                        <div className="corner-cd-fallback" aria-hidden="true">
                            <SongIcon
                                size={32}
                                strokeWidth={1.5}
                                className="text-(--corner-accent)"
                            />
                        </div>
                    )}
                </div>

                <span className="corner-tile-title">{song.title}</span>

                {song.author && (
                    <span className="corner-tile-meta">{song.author}</span>
                )}
            </a>

            <div className="mt-2 flex items-center justify-between">
                <a
                    href={song.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={providerLabel(song.provider)}
                    title={providerLabel(song.provider)}
                    className="corner-tile-icon-btn"
                >
                    <ProviderIcon provider={song.provider} />
                </a>

                <Toggle
                    className="corner-done-toggle corner-done-toggle--icon"
                    pressed={isDone}
                    onPressedChange={handleToggleDone}
                    aria-label={isDone ? 'Unlove this song' : 'Love this song'}
                    title={isDone ? 'Unlove this song' : 'Love this song'}
                >
                    <HeartMark filled={isDone} />
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
                            {onEdit && song.can.update && (
                                <DropdownMenuItem
                                    onSelect={menu.defer(handleEdit)}
                                >
                                    Edit
                                </DropdownMenuItem>
                            )}
                            {song.can.delete && (
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
