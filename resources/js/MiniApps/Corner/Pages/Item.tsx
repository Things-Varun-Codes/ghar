import { router } from '@inertiajs/react';
import { ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import DetailPage from '@/MiniApps/Corner/Components/DetailPage';
import ItemDialog from '@/MiniApps/Corner/Components/ItemDialog';
import type { MentionedInRef } from '@/MiniApps/Corner/Components/MentionedInList';
import PlexLink from '@/MiniApps/Corner/Components/PlexLink';
import { providerName } from '@/MiniApps/Corner/Components/ProviderLink';
import { useItemActions } from '@/MiniApps/Corner/Hooks/useItemActions';
import CornerLayout from '@/MiniApps/Corner/Layouts/CornerLayout';
import { ListIcon } from '@/MiniApps/Corner/lib/list-icons';
import type { CornerItem, CornerListInfo } from '@/MiniApps/Corner/lib/types';
import { show as showList } from '@/routes/apps/our-corner/lists';

type Props = {
    list: CornerListInfo;
    item: CornerItem;
    mentioned_in: MentionedInRef[];
};

// A plain search link needs no API key; a picked place also pins the exact listing.
function googleMapsUrl(item: CornerItem): string {
    const params = new URLSearchParams({
        api: '1',
        query: [item.title, item.address].filter(Boolean).join(', '),
        ...(item.place_id ? { query_place_id: item.place_id } : {}),
    });

    return `https://www.google.com/maps/search/?${params.toString()}`;
}

function ExternalCta({ href, label }: { href: string; label: string }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="corner-detail-cta shell-press"
        >
            {label}
            <ArrowUpRight aria-hidden="true" size={16} strokeWidth={1.5} />
        </a>
    );
}

export default function Item({ list, item, mentioned_in }: Props) {
    const [imageBroken, setImageBroken] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const listUrl = showList.url(list.slug);
    const provider = providerName(item.provider);

    const itemActions = useItemActions({
        id: item.id,
        title: item.title,
        onOpenEdit: () => setEditOpen(true),
        onDeleted: () => router.visit(listUrl),
    });

    const hero = () => {
        switch (list.kind) {
            case 'link':
                return (
                    <div className="corner-cd corner-cd--lg corner-detail-hero-media">
                        {item.image_url && !imageBroken ? (
                            <img
                                src={item.image_url}
                                alt=""
                                className="corner-cd-cover"
                                onError={() => setImageBroken(true)}
                            />
                        ) : (
                            <div
                                className="corner-cd-fallback"
                                aria-hidden="true"
                            >
                                <ListIcon
                                    name={list.icon}
                                    size={48}
                                    strokeWidth={1.5}
                                    className="corner-detail-fallback-icon"
                                />
                            </div>
                        )}
                    </div>
                );
            case 'poster':
                return item.image_url && !imageBroken ? (
                    <img
                        src={item.image_url}
                        alt=""
                        onError={() => setImageBroken(true)}
                        className="corner-detail-poster corner-detail-hero-media"
                    />
                ) : (
                    <div
                        aria-hidden="true"
                        className="corner-detail-poster-fallback corner-detail-hero-media"
                    >
                        <ListIcon
                            name={list.icon}
                            size={48}
                            strokeWidth={1.5}
                            className="corner-detail-fallback-icon"
                        />
                    </div>
                );
            case 'place':
                return (
                    <div className="corner-detail-place">
                        <ListIcon
                            name={list.icon}
                            aria-hidden="true"
                            size={28}
                            strokeWidth={1.5}
                            className="corner-detail-place-icon"
                        />
                        <div>
                            {item.address && (
                                <p className="corner-detail-lede">
                                    {item.address}
                                </p>
                            )}
                            {item.lat !== null && item.lng !== null && (
                                <p className="corner-detail-coords">
                                    {item.lat.toFixed(5)}, {item.lng.toFixed(5)}
                                </p>
                            )}
                        </div>
                    </div>
                );
            case 'plain':
                return null;
        }
    };

    const externalCta = () => {
        if (list.kind === 'place') {
            return (
                <ExternalCta
                    href={googleMapsUrl(item)}
                    label="Open in Google Maps"
                />
            );
        }

        if (!item.url) {
            return null;
        }

        if (list.kind === 'poster') {
            return <PlexLink href={item.url} />;
        }

        return (
            <ExternalCta
                href={item.url}
                label={provider ? `Open in ${provider}` : 'Open link'}
            />
        );
    };

    return (
        <CornerLayout>
            <DetailPage
                title={item.title}
                back={{ href: listUrl, label: list.name }}
                can={item.can}
                addedByName={item.addedBy.name}
                metaSuffix={provider ?? undefined}
                mentionedIn={mentioned_in}
                isDone={item.is_done}
                doneIcon={list.done_icon}
                doneLabel={list.done_label}
                itemActions={itemActions}
                hero={hero}
                body={() => (
                    <>
                        {list.kind === 'link' && item.author && (
                            <p className="corner-detail-lede">{item.author}</p>
                        )}
                        {item.notes && (
                            <p className="corner-detail-notes">{item.notes}</p>
                        )}
                    </>
                )}
                externalCta={externalCta}
            />

            {item.can.update && editOpen && (
                <ItemDialog
                    list={list}
                    item={item}
                    open
                    onOpenChange={(next) => {
                        if (!next) {
                            setEditOpen(false);
                        }
                    }}
                />
            )}
        </CornerLayout>
    );
}
