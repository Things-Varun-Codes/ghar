import { cn } from '@/lib/utils';
import MailDeleteMenu from '@/MiniApps/Mailbox/Components/MailDeleteMenu';
import MailMeta from '@/MiniApps/Mailbox/Components/MailMeta';
import AppCard from '@/Shell/Components/AppCard';
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
                    <MailDeleteMenu
                        noun="note"
                        label={`Actions for your note to ${recipientNames}, ${message.posted_at_human}`}
                        triggerClassName="mailbox-card-menu"
                        onDelete={onDelete}
                    />
                )}
            </div>
        </AppCard>
    );
}
