import { MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMenuAction } from '@/hooks/use-menu-action';
import { cn } from '@/lib/utils';
import AppCard from '@/Shell/Components/AppCard';

export type FlowerEntry = { key: string; name: string; meaning: string };

export type MessageItem = {
    id: number;
    body: string | null;
    posted_at: string;
    posted_at_human: string;
    read_at: string | null;
    is_unread: boolean;
    is_mine: boolean;
    sender: { id: number; name: string };
    recipients: { id: number; name: string }[];
};

type Props = {
    message: MessageItem;
    onDelete?: () => void;
    isFocused?: boolean;
};

export default function NoteCard({ message, onDelete, isFocused }: Props) {
    const [confirmOpen, setConfirmOpen] = useState(false);
    const menu = useMenuAction();

    return (
        <AppCard
            variant="note"
            base="mailbox-card"
            className={cn(
                ['mailbox-note', isFocused ? 'focused' : '']
                    .filter(Boolean)
                    .join(' '),
                'relative mt-2 [border-top:none]',
            )}
            id={`mailbox-note-${message.id}`}
            data-id={message.id}
        >
            <p className="mailbox-hand mailbox-note-body">{message.body}</p>

            <div className="flex min-h-[32px] items-end justify-between gap-2">
                <p className="mailbox-note-meta">
                    {message.is_mine
                        ? `you to ${message.recipients.map((r) => r.name).join(', ')}`
                        : message.sender.name}{' '}
                    · {message.posted_at_human}
                </p>

                {message.is_mine && onDelete && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                aria-label="Note actions"
                                className="mailbox-card-menu"
                            >
                                <MoreHorizontal size={18} aria-hidden="true" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            onCloseAutoFocus={menu.onCloseAutoFocus}
                            align="end"
                            data-app="our-mailbox"
                        >
                            <DropdownMenuItem
                                variant="destructive"
                                onSelect={menu.defer(() =>
                                    setConfirmOpen(true),
                                )}
                            >
                                Delete note
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {message.is_mine && onDelete && (
                <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                    <AlertDialogContent data-app="our-mailbox">
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                Delete this note?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                This can&apos;t be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Keep it</AlertDialogCancel>
                            <AlertDialogAction
                                className={buttonVariants({
                                    variant: 'destructive',
                                })}
                                onClick={() => {
                                    setConfirmOpen(false);
                                    onDelete?.();
                                }}
                            >
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </AppCard>
    );
}
