import { Maximize2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import MailDeleteMenu from '@/MiniApps/Mailbox/Components/MailDeleteMenu';
import MailMeta from '@/MiniApps/Mailbox/Components/MailMeta';
import type { FlowerEntry } from '@/MiniApps/Mailbox/Components/NoteCard';
import AppCard from '@/Shell/Components/AppCard';
import MediaLightbox from '@/Shell/Components/MediaLightbox';
import type { MediaLightboxHandle } from '@/Shell/Components/MediaLightbox';
import type { Person } from '@/types/person';

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
    sender: Person;
    recipients: Person[];
};

type Props = {
    message: BouquetItem;
    onDelete?: () => void;
    isFocused?: boolean;
};

export default function BouquetCard({ message, onDelete, isFocused }: Props) {
    const lightboxRef = useRef<MediaLightboxHandle>(null);
    // The generator's size isn't fixed, so the lightbox takes it from the loaded picture.
    const [size, setSize] = useState<{ width: number; height: number }>();
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
                            onClick={() => lightboxRef.current?.open(0)}
                            className="mailbox-bouquet-image-button"
                        >
                            <img
                                src={message.image_url}
                                alt="Flower bouquet"
                                className="block h-full w-full object-cover"
                                onLoad={(e) =>
                                    setSize({
                                        width: e.currentTarget.naturalWidth,
                                        height: e.currentTarget.naturalHeight,
                                    })
                                }
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
                    <MailMeta
                        mail={message}
                        className="mailbox-hand-meta mailbox-bouquet-meta"
                    />

                    {message.is_mine && onDelete && (
                        <MailDeleteMenu
                            noun="bouquet"
                            label={`Actions for your bouquet to ${recipientNames}, ${message.posted_at_human}`}
                            triggerClassName="mailbox-card-menu-square"
                            onDelete={onDelete}
                        />
                    )}
                </div>
            </AppCard>

            {message.image_url && (
                <MediaLightbox
                    ref={lightboxRef}
                    media={[
                        {
                            kind: 'photo',
                            original: message.image_url,
                            ...size,
                            alt: 'Flower bouquet',
                            title: message.is_mine
                                ? 'Your bouquet'
                                : `From ${message.sender.name}`,
                            subtitle: message.posted_at_human,
                        },
                    ]}
                />
            )}
        </>
    );
}
