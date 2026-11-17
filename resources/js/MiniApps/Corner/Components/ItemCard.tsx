import { Link } from '@inertiajs/react';
import { ExternalLink, MapPin, MoreHorizontal } from 'lucide-react';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Toggle } from '@/components/ui/toggle';
import { useMenuAction } from '@/hooks/use-menu-action';
import { DoneGlyph, DoneSticker } from '@/MiniApps/Corner/Components/DoneMark';
import ItemThumb from '@/MiniApps/Corner/Components/ItemThumb';
import { useItemActions } from '@/MiniApps/Corner/Hooks/useItemActions';
import { bylineOf } from '@/MiniApps/Corner/lib/copy';
import { hasPlace, placeLabel } from '@/MiniApps/Corner/lib/maps';
import type { CornerItem, CornerListInfo } from '@/MiniApps/Corner/lib/types';
import { show } from '@/routes/apps/our-corner/items';
import AppCard from '@/Shell/Components/AppCard';

type Props = {
    list: CornerListInfo;
    item: CornerItem;
    onEdit?: () => void;
};

function firstLine(notes: string | null): string | null {
    const line = notes?.split('\n')[0].trim() ?? '';

    if (line === '') {
        return null;
    }

    return line.length > 90 ? `${line.slice(0, 90).trim()}…` : line;
}

/* The one card every item gets, whatever it holds. */
export default function ItemCard({ list, item, onEdit }: Props) {
    const menu = useMenuAction();
    const {
        isPendingDelete,
        isTogglePending,
        handleEdit,
        handleToggleDone,
        handleDelete,
    } = useItemActions({
        id: item.id,
        title: item.title,
        onOpenEdit: onEdit,
    });

    if (isPendingDelete) {
        return null;
    }

    const isDone = item.is_done;
    const byline = bylineOf(item);
    const preview = firstLine(item.notes);

    return (
        <AppCard
            base="corner-card"
            variant="list"
            data-app="our-corner"
            className="corner-item shell-card-stretch shell-lift"
        >
            <div className="corner-item-row">
                <ItemThumb pictureUrl={item.picture_url} icon={list.icon} />

                <div className="corner-item-main">
                    <Link
                        href={show.url([list.slug, item.id])}
                        className="shell-card-link corner-item-link"
                    >
                        <span className="corner-row-title">{item.title}</span>
                    </Link>
                    {isDone && (
                        <DoneSticker
                            icon={list.done_icon}
                            label={list.done_label}
                        />
                    )}
                    {byline && (
                        <span className="corner-item-byline">{byline}</span>
                    )}
                    {preview && (
                        <span className="corner-item-notes">{preview}</span>
                    )}
                    {hasPlace(item) && (
                        <span className="corner-item-place">
                            <MapPin
                                aria-hidden="true"
                                size={14}
                                strokeWidth={1.5}
                            />
                            {placeLabel(item)}
                        </span>
                    )}
                    <span className="corner-row-meta">
                        Added by {item.addedBy.name}
                    </span>
                </div>

                <div className="corner-item-actions">
                    <Toggle
                        className="corner-done-toggle corner-done-toggle--icon shell-press shell-hit-44"
                        pressed={isDone}
                        onPressedChange={handleToggleDone}
                        aria-disabled={isTogglePending || undefined}
                        aria-label={`${list.done_label}: ${item.title}`}
                        title={list.done_label}
                    >
                        <DoneGlyph icon={list.done_icon} done={isDone} />
                    </Toggle>

                    {item.url && (
                        <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Open the link for ${item.title}`}
                            title="Open the link"
                            className="corner-icon-btn shell-press"
                        >
                            <ExternalLink
                                aria-hidden="true"
                                size={18}
                                strokeWidth={1.5}
                            />
                        </a>
                    )}

                    {(item.can.update || item.can.delete) && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    aria-label={`Actions for ${item.title}`}
                                    className="corner-icon-btn shell-press"
                                >
                                    <MoreHorizontal
                                        size={18}
                                        aria-hidden="true"
                                    />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                onCloseAutoFocus={menu.onCloseAutoFocus}
                                align="end"
                            >
                                {onEdit && item.can.update && (
                                    <DropdownMenuItem
                                        onSelect={menu.defer(handleEdit)}
                                    >
                                        Edit
                                    </DropdownMenuItem>
                                )}
                                {item.can.delete && (
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
            </div>
        </AppCard>
    );
}
