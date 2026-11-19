import { MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import MailMeta from '@/MiniApps/Mailbox/Components/MailMeta';
import AppCard from '@/Shell/Components/AppCard';
import ConfirmDialog from '@/Shell/Components/ConfirmDialog';
import type { Person } from '@/types/person';

export type FlowerEntry = { key: string; name: string; meaning: string };

export type MessageItem = {
    id: number;
    body: string | null;
    posted_at: string;
    posted_at_human: string;
    read_at: string | null;
    is_unread: boolean;
    is_mine: boolean;
    sender: Person;
    recipients: Person[];
};

type Props = {
    message: MessageItem;
    onDelete?: () => void;
    isFocused?: boolean;
};

export default function NoteCard({ message, onDelete, isFocused }: Props) {
    const [confirmOpen, setConfirmOpen] = useState(false);
    const recipientNames = message.recipients.map((r) => r.name).join(', ');

    return (
        <AppCard
            variant="note"
            base="mailbox-card"
            className={cn(
                'mailbox-note relative mt-2 [border-top:none]',
                isFocused && 'focused',
            )}
            // Focusable only when a link pointed here, so the list scroll can land on it.
            tabIndex={isFocused ? -1 : undefined}
            id={`mailbox-note-${message.id}`}
            data-id={message.id}
        >
            <p className="mailbox-hand mailbox-note-body">{message.body}</p>

            <div className="flex min-h-[32px] items-end justify-between gap-2">
                <MailMeta mail={message} className="mailbox-note-meta" />

                {message.is_mine && onDelete && (
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            aria-label={`Actions for your note to ${recipientNames}, ${message.posted_at_human}`}
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
                            <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setConfirmOpen(true)}
                            >
                                Delete note
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {message.is_mine && onDelete && (
                <ConfirmDialog
                    open={confirmOpen}
                    onOpenChange={setConfirmOpen}
                    title="Delete this note?"
                    description="This can't be undone."
                    cancelLabel="Keep it"
                    confirmLabel="Delete"
                    variant="destructive"
                    onConfirm={() => {
                        setConfirmOpen(false);
                        onDelete();
                    }}
                />
            )}
        </AppCard>
    );
}
