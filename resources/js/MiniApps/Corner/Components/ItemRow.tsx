import { Link } from '@inertiajs/react';
import { MoreHorizontal } from 'lucide-react';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Toggle } from '@/components/ui/toggle';
import { useMenuAction } from '@/hooks/use-menu-action';
import { DoneGlyph, DoneSticker } from '@/MiniApps/Corner/Components/DoneMark';
import { useItemActions } from '@/MiniApps/Corner/Hooks/useItemActions';
import { ListIcon } from '@/MiniApps/Corner/lib/list-icons';
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

    return line.length > 80 ? `${line.slice(0, 80).trim()}…` : line;
}

/* A row for the two kinds without artwork: plain, and a place with its pin. */
export default function ItemRow({ list, item, onEdit }: Props) {
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

    const isDone = item.done_at !== null;
    const isPlace = list.kind === 'place';
    const preview = firstLine(item.notes);

    return (
        <AppCard
            variant="list"
            data-app="our-corner"
            className="shell-card-stretch shell-lift"
        >
            <div className="corner-item-row">
                <div className="corner-item-main">
                    <Link
                        href={show.url([list.slug, item.id])}
                        className="shell-card-link flex min-w-0 flex-1 items-start gap-3 text-inherit no-underline"
                    >
                        {isPlace && (
                            <ListIcon
                                name={list.icon}
                                aria-hidden="true"
                                size={18}
                                strokeWidth={1.5}
                                className="corner-row-pin mt-1 shrink-0"
                            />
                        )}
                        <span className="min-w-0 flex-1">
                            <span className="corner-row-title">
                                {item.title}
                                {isDone && (
                                    <DoneSticker
                                        icon={list.done_icon}
                                        label={list.done_label}
                                        inline
                                    />
                                )}
                            </span>
                            {isPlace && item.address && (
                                <span className="corner-place-address">
                                    {item.address}
                                </span>
                            )}
                            {preview && (
                                <span className="corner-activity-preview">
                                    {preview}
                                </span>
                            )}
                            <span className="corner-row-meta">
                                Added by {item.addedBy.name}
                            </span>
                        </span>
                    </Link>
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
