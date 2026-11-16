import { router } from '@inertiajs/react';
import { MoreHorizontal } from 'lucide-react';
import { useState } from 'react';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMenuAction } from '@/hooks/use-menu-action';
import { mutationOptions } from '@/lib/mutation';
import ListSettingsSheet from '@/MiniApps/Corner/Components/ListSettingsSheet';
import type { CornerListInfo } from '@/MiniApps/Corner/lib/types';
import { destroy, move } from '@/routes/apps/our-corner/lists';
import ConfirmDialog from '@/Shell/Components/ConfirmDialog';

const COMPONENT = 'Corner/ListMenu';

type Props = {
    list: CornerListInfo;
    /* How many things are in it, for the delete warning. */
    count?: number;
    /* On the landing, where the order of the shelf shows. */
    reorder?: { first: boolean; last: boolean };
};

/* Change, move or delete one list. The server decides who may; this only hides what they can't. */
export default function ListMenu({ list, count, reorder }: Props) {
    const menu = useMenuAction();
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pending, setPending] = useState(false);

    const moveTo = (direction: 'up' | 'down') => {
        router.patch(
            move.url(list.id),
            { direction },
            {
                preserveScroll: true,
                ...mutationOptions({
                    component: COMPONENT,
                    action: 'move',
                    onPendingChange: setPending,
                }),
            },
        );
    };

    const deleteList = () => {
        router.delete(destroy.url(list.id), {
            ...mutationOptions({
                component: COMPONENT,
                action: 'delete',
                onPendingChange: setPending,
            }),
            onSuccess: () => setConfirmOpen(false),
        });
    };

    const canMove = reorder !== undefined && !(reorder.first && reorder.last);
    const hasItems =
        list.can.update ||
        list.can.delete ||
        list.delete_needs_admin ||
        canMove;

    if (!hasItems) {
        return null;
    }

    const warning =
        count === 0
            ? "It's empty, so nothing else goes with it."
            : `${
                  count === undefined
                      ? 'Everything in it goes'
                      : count === 1
                        ? 'The one thing in it goes'
                        : `All ${count} things in it go`
              } too, for everyone. Links to them from Our History will show as removed.`;

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        aria-label={`Options for ${list.name}`}
                        disabled={pending}
                        className="corner-icon-btn corner-list-menu-btn shell-press"
                    >
                        <MoreHorizontal size={18} aria-hidden="true" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    onCloseAutoFocus={menu.onCloseAutoFocus}
                    align="end"
                >
                    {list.can.update && (
                        <DropdownMenuItem
                            onSelect={menu.defer(() => setSettingsOpen(true))}
                        >
                            List settings
                        </DropdownMenuItem>
                    )}
                    {canMove && !reorder.first && (
                        <DropdownMenuItem onSelect={() => moveTo('up')}>
                            Move earlier
                        </DropdownMenuItem>
                    )}
                    {canMove && !reorder.last && (
                        <DropdownMenuItem onSelect={() => moveTo('down')}>
                            Move later
                        </DropdownMenuItem>
                    )}
                    {list.can.delete && (
                        <DropdownMenuItem
                            variant="destructive"
                            onSelect={menu.defer(() => setConfirmOpen(true))}
                        >
                            Delete list
                        </DropdownMenuItem>
                    )}
                    {list.delete_needs_admin && (
                        <DropdownMenuItem disabled>
                            Others have added to it, so only an admin can delete
                            it
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {settingsOpen && (
                <ListSettingsSheet
                    list={list}
                    open
                    onOpenChange={(next) => {
                        if (!next) {
                            setSettingsOpen(false);
                        }
                    }}
                />
            )}

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={`Delete ${list.name}?`}
                description={warning}
                confirmLabel="Delete list"
                variant="destructive"
                processing={pending}
                onConfirm={deleteList}
            />
        </>
    );
}
