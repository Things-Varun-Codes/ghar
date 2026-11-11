import { MoreHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMenuAction } from '@/hooks/use-menu-action';
import type {
    CornerItemType,
    ItemPermissions,
} from '@/MiniApps/Corner/Hooks/useItemActions';
import { useItemActions } from '@/MiniApps/Corner/Hooks/useItemActions';
import AppCard from '@/Shell/Components/AppCard';

type ItemConstraint = {
    id: number;
    added_by_user_id: number;
    done_at: string | null;
    title?: string | null;
};

type ListItemCardProps<TItem extends ItemConstraint> = {
    listType: CornerItemType;
    item: TItem;
    can: ItemPermissions;
    renderMain: () => ReactNode;
    onEdit?: () => void;
};

export default function ListItemCard<TItem extends ItemConstraint>({
    listType,
    item,
    can,
    renderMain,
    onEdit,
}: ListItemCardProps<TItem>) {
    const menu = useMenuAction();
    const { isPendingDelete, handleEdit, handleDelete } = useItemActions({
        type: listType,
        id: item.id,
        title: item.title ?? null,
        onOpenEdit: onEdit,
    });

    if (isPendingDelete) {
        return null;
    }

    return (
        <AppCard
            variant="list"
            data-app="our-corner"
            className="shell-card-stretch"
        >
            <div className="corner-item-row">
                <div className="corner-item-main">{renderMain()}</div>

                <div className="corner-item-actions">
                    {(can.update || can.delete) && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    aria-label="Item actions"
                                    className="corner-icon-btn"
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
                                data-app="our-corner"
                            >
                                {onEdit && can.update && (
                                    <DropdownMenuItem
                                        onSelect={menu.defer(handleEdit)}
                                    >
                                        Edit
                                    </DropdownMenuItem>
                                )}
                                {can.delete && (
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
