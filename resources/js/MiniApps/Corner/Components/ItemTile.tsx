import { Link } from '@inertiajs/react';
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
import { DoneGlyph, DoneSticker } from '@/MiniApps/Corner/Components/DoneMark';
import ProviderLink from '@/MiniApps/Corner/Components/ProviderLink';
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

/* A link in a CD frame or a poster, for the two kinds that carry artwork. */
export default function ItemTile({ list, item, onEdit }: Props) {
    const [imageBroken, setImageBroken] = useState(false);
    const menu = useMenuAction();
    const cd = list.kind === 'link';
    const frame = cd ? 'corner-cd' : 'corner-poster';

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
    const canManage = item.can.update || item.can.delete;

    return (
        <AppCard
            variant="list"
            data-app="our-corner"
            className="shell-card-stretch shell-lift"
        >
            <Link
                href={show.url([list.slug, item.id])}
                className="shell-card-link block text-inherit no-underline"
            >
                <div className={frame}>
                    {isDone && (
                        <DoneSticker
                            icon={list.done_icon}
                            label={list.done_label}
                        />
                    )}
                    {item.image_url && !imageBroken ? (
                        <img
                            src={item.image_url}
                            alt=""
                            className={`${frame}-cover`}
                            onError={() => setImageBroken(true)}
                        />
                    ) : (
                        <div className={`${frame}-fallback`} aria-hidden="true">
                            <ListIcon
                                name={list.icon}
                                size={32}
                                strokeWidth={1.5}
                                className="text-(--corner-accent-text)"
                            />
                        </div>
                    )}
                </div>

                <span className="corner-tile-title">{item.title}</span>

                <span className="corner-tile-meta">
                    {cd && item.author
                        ? item.author
                        : `Added by ${item.addedBy.name}`}
                </span>
            </Link>

            <div className="mt-2 flex items-center justify-between">
                <ProviderLink
                    kind={cd ? 'link' : 'poster'}
                    url={item.url}
                    provider={item.provider}
                    title={item.title}
                />

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

                {!canManage && <span aria-hidden="true" className="w-10" />}

                {canManage && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                aria-label={`Actions for ${item.title}`}
                                className="corner-tile-icon-btn shell-press shell-hit-44"
                            >
                                <MoreHorizontal size={18} aria-hidden="true" />
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
        </AppCard>
    );
}
