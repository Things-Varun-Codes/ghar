import { Link } from '@inertiajs/react';
import { MapPin, MoreHorizontal } from 'lucide-react';

import { Reveal } from '@/components/motion';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Toggle } from '@/components/ui/toggle';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { DoneGlyph, DoneSticker } from '@/MiniApps/Corner/Components/DoneMark';
import ItemThumb from '@/MiniApps/Corner/Components/ItemThumb';
import { useItemActions } from '@/MiniApps/Corner/Hooks/useItemActions';
import type { UseItemActionsReturn } from '@/MiniApps/Corner/Hooks/useItemActions';
import { bylineOf } from '@/MiniApps/Corner/lib/copy';
import { hasPlace, placeLabel } from '@/MiniApps/Corner/lib/maps';
import type { CornerItem, CornerListInfo } from '@/MiniApps/Corner/lib/types';
import { show } from '@/routes/apps/our-shelf/items';
import AppCard from '@/Shell/Components/AppCard';
import PersonAvatar from '@/Shell/Components/PersonAvatar';

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

/*
 * The one card every item gets, whatever it holds. Removing it folds the card away while the
 * Undo toast is up, and Undo opens it again; the actions stay here, so the timer outlives the
 * folded card.
 */
export default function ItemCard({ list, item, onEdit }: Props) {
    const actions = useItemActions({
        id: item.id,
        title: item.title,
    });

    return (
        // The padding, taken back by the margin, keeps the lift and focus ring clear of the clip.
        <Reveal show={!actions.isPendingDelete} className="-m-1 p-1">
            <ItemCardBody
                list={list}
                item={item}
                onEdit={onEdit}
                actions={actions}
            />
        </Reveal>
    );
}

function ItemCardBody({
    list,
    item,
    onEdit,
    actions,
}: Props & { actions: UseItemActionsReturn }) {
    const { isTogglePending, handleToggleDone, handleDelete } = actions;
    const isDone = item.is_done;
    const byline = bylineOf(item);
    const preview = firstLine(item.notes);

    return (
        <AppCard
            base="corner-card"
            variant="list"
            data-app="our-shelf"
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
                    <DoneSticker
                        icon={list.done_icon}
                        label={list.done_label}
                        show={isDone}
                        animated
                    />
                    {byline && (
                        <span className="corner-item-byline">{byline}</span>
                    )}
                    {preview && (
                        <span className="corner-item-notes">{preview}</span>
                    )}
                    {hasPlace(item) && placeLabel(item) !== item.title && (
                        <span className="corner-item-place">
                            <MapPin
                                aria-hidden="true"
                                size={14}
                                strokeWidth={1.5}
                            />
                            {placeLabel(item)}
                        </span>
                    )}
                    <span className="corner-row-meta corner-added-by">
                        <PersonAvatar person={item.addedBy} size={20} />
                        Added by {item.addedBy.name}
                    </span>
                </div>

                <div className="corner-item-actions">
                    <Tooltip>
                        <TooltipTrigger
                            render={
                                <Toggle
                                    className="corner-done-toggle corner-done-toggle--icon shell-press shell-hit-44"
                                    pressed={isDone}
                                    onPressedChange={handleToggleDone}
                                    aria-disabled={isTogglePending || undefined}
                                    aria-label={`${list.done_label}: ${item.title}`}
                                />
                            }
                        >
                            <DoneGlyph icon={list.done_icon} done={isDone} />
                        </TooltipTrigger>
                        <TooltipContent>{list.done_label}</TooltipContent>
                    </Tooltip>

                    {/* The link lives in the menu, so the card's edge holds two controls, not three;
                        the item's own page keeps it one tap away. */}
                    {(item.url || item.can.update || item.can.delete) && (
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={<Button variant="ghost" size="icon" />}
                                aria-label={`Actions for ${item.title}`}
                                className="corner-icon-btn shell-press"
                            >
                                <MoreHorizontal size={18} aria-hidden="true" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {item.url && (
                                    <DropdownMenuItem
                                        onClick={() =>
                                            window.open(
                                                item.url ?? undefined,
                                                '_blank',
                                                'noopener,noreferrer',
                                            )
                                        }
                                    >
                                        Open link
                                    </DropdownMenuItem>
                                )}
                                {onEdit && item.can.update && (
                                    <DropdownMenuItem onClick={onEdit}>
                                        Edit
                                    </DropdownMenuItem>
                                )}
                                {item.can.delete && (
                                    <DropdownMenuItem
                                        variant="destructive"
                                        onClick={handleDelete}
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
