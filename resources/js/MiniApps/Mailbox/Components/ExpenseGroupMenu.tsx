import { router } from '@inertiajs/react';
import { MoreHorizontal } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSheetSession } from '@/hooks/use-sheet-session';
import { mutationOptions } from '@/lib/mutation';
import ExpenseGroupSheet from '@/MiniApps/Mailbox/Components/ExpenseGroupSheet';
import type { ExpenseGroup } from '@/MiniApps/Mailbox/Components/ExpenseGroupSheet';
import {
    archive,
    destroy,
    unarchive,
} from '@/routes/apps/our-exchange/expenses/groups';
import ConfirmDialog from '@/Shell/Components/ConfirmDialog';
import type { Person } from '@/types/person';

export type ExpenseGroupAbilities = {
    write: boolean;
    manage: boolean;
    archive: boolean;
    delete: boolean;
};

type Props = {
    group: ExpenseGroup & { can: ExpenseGroupAbilities };
    household: Person[];
    viewerId: number;
};

const COMPONENT = 'Mailbox/ExpenseGroupMenu';

export default function ExpenseGroupMenu({
    group,
    household,
    viewerId,
}: Props) {
    const details = useSheetSession<true>();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pending, setPending] = useState(false);

    if (!group.can.manage) {
        return null;
    }

    const options = (action: string) => ({
        preserveScroll: true,
        ...mutationOptions({
            component: COMPONENT,
            action: `expense-group.${action}`,
            onPendingChange: setPending,
        }),
    });

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger
                    aria-label={`Options for ${group.name}`}
                    disabled={pending}
                    render={
                        <Button
                            variant="ghost"
                            size="icon"
                            className="mailbox-card-menu shell-hit-44"
                        />
                    }
                >
                    <MoreHorizontal
                        size={18}
                        strokeWidth={1.5}
                        aria-hidden="true"
                    />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {!group.archived && (
                        <DropdownMenuItem onClick={() => details.show(true)}>
                            Name and members
                        </DropdownMenuItem>
                    )}
                    {group.can.archive && (
                        <DropdownMenuItem
                            onClick={() =>
                                router.patch(
                                    archive.url(group.id),
                                    {},
                                    options('archive'),
                                )
                            }
                        >
                            Archive group
                        </DropdownMenuItem>
                    )}
                    {!group.archived && !group.can.archive && (
                        <DropdownMenuItem disabled>
                            Settle every balance to archive it
                        </DropdownMenuItem>
                    )}
                    {group.archived && (
                        <DropdownMenuItem
                            onClick={() =>
                                router.patch(
                                    unarchive.url(group.id),
                                    {},
                                    options('unarchive'),
                                )
                            }
                        >
                            Unarchive group
                        </DropdownMenuItem>
                    )}
                    {group.can.delete && (
                        <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setConfirmOpen(true)}
                        >
                            Delete group
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {details.value && (
                <ExpenseGroupSheet
                    key={details.key}
                    open={details.open}
                    onOpenChange={details.onOpenChange}
                    household={household}
                    viewerId={viewerId}
                    group={group}
                />
            )}

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={`Delete ${group.name}?`}
                description="Nothing has been added to it, so nothing else goes with it."
                cancelLabel="Keep it"
                confirmLabel="Delete group"
                variant="destructive"
                onConfirm={() =>
                    router.delete(destroy.url(group.id), options('delete'))
                }
            />
        </>
    );
}
