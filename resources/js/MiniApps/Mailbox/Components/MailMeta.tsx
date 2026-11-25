import { AvatarGroup } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import PersonAvatar from '@/Shell/Components/PersonAvatar';
import type { Person } from '@/types/person';

/* Past this many, the names still say who; more faces would only crowd the line. */
const MAX_FACES = 4;

type Props = {
    mail: {
        is_unread: boolean;
        is_mine: boolean;
        sender: Person;
        recipients: Person[];
        posted_at_human: string;
    };
    className: string;
};

/* Under a note or postcard: who it's from, or for what you sent, who it went to. */
export default function MailMeta({ mail, className }: Props) {
    const recipientNames = mail.recipients.map((r) => r.name).join(', ');

    return (
        <div className={cn('mailbox-mail-meta', className)}>
            {mail.is_unread && <Badge>New</Badge>}
            {mail.is_mine ? (
                <AvatarGroup className="mailbox-mail-meta-faces">
                    {mail.recipients.slice(0, MAX_FACES).map((recipient) => (
                        <PersonAvatar
                            key={recipient.id}
                            person={recipient}
                            size={24}
                        />
                    ))}
                </AvatarGroup>
            ) : (
                <PersonAvatar person={mail.sender} size={24} />
            )}
            <span className="min-w-0">
                {mail.is_mine ? `you to ${recipientNames}` : mail.sender.name} ·{' '}
                {mail.posted_at_human}
            </span>
        </div>
    );
}
