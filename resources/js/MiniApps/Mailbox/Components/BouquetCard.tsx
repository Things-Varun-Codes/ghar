import { Maximize2, MoreHorizontal } from 'lucide-react';
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
import BouquetDialog from '@/MiniApps/Mailbox/Components/BouquetDialog';
import type { FlowerEntry } from '@/MiniApps/Mailbox/Components/NoteCard';
import AppCard from '@/Shell/Components/AppCard';

export type BouquetItem = {
    id: number;
    note: string | null;
    image_url: string | null;
    flowers: FlowerEntry[] | null;
    posted_at: string;
    posted_at_human: string;
    read_at: string | null;
    is_unread: boolean;
    is_mine: boolean;
    sender: { id: number; name: string };
    recipients: { id: number; name: string }[];
};

type Props = {
    message: BouquetItem;
    onDelete?: () => void;
    isFocused?: boolean;
};

export default function BouquetCard({ message, onDelete, isFocused }: Props) {
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const menu = useMenuAction();
    const recipientNames = message.recipients.map((r) => r.name).join(', ');
    const from = message.is_mine
        ? 'your bouquet'
        : `bouquet from ${message.sender.name}`;

    return (
        <>
            <AppCard
                variant="list"
                base="mailbox-card"
                className={cn('mailbox-bouquet', isFocused && 'focused')}
                // Focusable only when a link pointed here, so the list scroll can land on it.
                tabIndex={isFocused ? -1 : undefined}
                id={`mailbox-note-${message.id}`}
                data-id={message.id}
            >
                <div className="flex flex-col gap-3">
                    {message.image_url && (
                        <button
                            type="button"
                            aria-label={`View ${from}, ${message.posted_at_human}, fullscreen`}
                            onClick={() => setLightboxOpen(true)}
                            className="mailbox-bouquet-image-button"
                        >
                            <img
                                src={message.image_url}
                                alt="Flower bouquet"
                                className="block h-full w-full object-cover"
                            />
                            <span
                                aria-hidden="true"
                                className="mailbox-bouquet-expand"
                            >
                                <Maximize2 size={16} strokeWidth={1.5} />
                            </span>
                        </button>
                    )}

                    <div className="min-w-0 flex-[1_1_auto]">
                        {message.note && (
                            <p className="mailbox-hand mailbox-bouquet-note">
                                {message.note}
                            </p>
                        )}

                        {message.flowers && message.flowers.length > 0 && (
                            <p className="mailbox-hand-meta mailbox-bouquet-flowers">
                                {message.flowers
                                    .map((f) => `${f.name}: ${f.meaning}`)
                                    .join(' · ')}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-end justify-between gap-2">
                    <p className="mailbox-hand-meta mailbox-bouquet-meta">
                        {message.is_unread && (
                            <span className="mailbox-unread">New</span>
                        )}
                        {message.is_mine
                            ? `you to ${recipientNames}`
                            : message.sender.name}{' '}
                        · {message.posted_at_human}
                    </p>

                    {message.is_mine && onDelete && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    aria-label={`Actions for your bouquet to ${recipientNames}, ${message.posted_at_human}`}
                                    className="mailbox-card-menu-square"
                                >
                                    <MoreHorizontal
                                        size={18}
                                        strokeWidth={1.5}
                                        aria-hidden="true"
                                    />
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
                                    Delete bouquet
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>

                {message.is_mine && onDelete && (
                    <AlertDialog
                        open={confirmOpen}
                        onOpenChange={setConfirmOpen}
                    >
                        <AlertDialogContent data-app="our-mailbox">
                            <AlertDialogHeader>
                                <AlertDialogTitle>
                                    Delete this bouquet?
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

            {message.image_url && (
                <BouquetDialog
                    open={lightboxOpen}
                    onOpenChange={setLightboxOpen}
                    imageUrl={message.image_url}
                />
            )}
        </>
    );
}
