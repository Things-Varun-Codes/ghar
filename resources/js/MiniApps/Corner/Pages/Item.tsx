import { router } from '@inertiajs/react';
import { ArrowUpRight, MapPin } from 'lucide-react';
import { useMemo } from 'react';
import DetailPage from '@/MiniApps/Corner/Components/DetailPage';
import ItemSheet from '@/MiniApps/Corner/Components/ItemSheet';
import ItemThumb from '@/MiniApps/Corner/Components/ItemThumb';
import type { MentionedInRef } from '@/MiniApps/Corner/Components/MentionedInList';
import { useItemActions } from '@/MiniApps/Corner/Hooks/useItemActions';
import { useSheetSession } from '@/MiniApps/Corner/Hooks/useSheetSession';
import CornerLayout from '@/MiniApps/Corner/Layouts/CornerLayout';
import { bylineOf } from '@/MiniApps/Corner/lib/copy';
import {
    hasPlace,
    mapsHref,
    placeLabel,
    platformOf,
} from '@/MiniApps/Corner/lib/maps';
import type { CornerItem, CornerListInfo } from '@/MiniApps/Corner/lib/types';
import { show as showList } from '@/routes/apps/our-shelf/lists';

type Props = {
    list: CornerListInfo;
    item: CornerItem;
    mentioned_in: MentionedInRef[];
};

function ExternalCta({
    href,
    label,
    newTab = true,
}: {
    href: string;
    label: string;
    newTab?: boolean;
}) {
    return (
        <a
            href={href}
            {...(newTab
                ? { target: '_blank', rel: 'noopener noreferrer' }
                : {})}
            className="corner-detail-cta shell-press"
        >
            {label}
            <ArrowUpRight aria-hidden="true" size={16} strokeWidth={1.5} />
        </a>
    );
}

export default function Item({ list, item, mentioned_in }: Props) {
    const editing = useSheetSession<true>();
    const listUrl = showList.url(list.slug);
    const maps = useMemo(
        () => mapsHref(item, platformOf(navigator.userAgent)),
        [item],
    );

    const itemActions = useItemActions({
        id: item.id,
        title: item.title,
        onDeleted: () => router.visit(listUrl),
    });

    const byline = bylineOf(item);

    return (
        <CornerLayout>
            <DetailPage
                title={item.title}
                back={{ href: listUrl, label: list.name }}
                can={item.can}
                addedBy={item.addedBy}
                mentionedIn={mentioned_in}
                isDone={item.is_done}
                doneIcon={list.done_icon}
                doneLabel={list.done_label}
                itemActions={itemActions}
                onEdit={() => editing.show(true)}
                hero={
                    <ItemThumb
                        pictureUrl={item.picture_url}
                        icon={list.icon}
                        size="lg"
                        className="corner-detail-hero-media"
                    />
                }
                body={
                    <>
                        {byline && (
                            <p className="corner-detail-lede">{byline}</p>
                        )}
                        {item.notes && (
                            <p className="corner-detail-notes">{item.notes}</p>
                        )}
                        {hasPlace(item) && (
                            <div className="corner-detail-place">
                                <MapPin
                                    aria-hidden="true"
                                    size={22}
                                    strokeWidth={1.5}
                                    className="corner-detail-place-icon"
                                />
                                <div>
                                    <p className="corner-detail-lede">
                                        {placeLabel(item)}
                                    </p>
                                    {item.address &&
                                        item.address !== placeLabel(item) && (
                                            <p className="corner-detail-coords">
                                                {item.address}
                                            </p>
                                        )}
                                </div>
                            </div>
                        )}
                    </>
                }
                externalCta={
                    <>
                        {item.url && (
                            <ExternalCta
                                href={item.url}
                                label={
                                    item.site_name
                                        ? `Open on ${item.site_name}`
                                        : 'Open the link'
                                }
                            />
                        )}
                        {maps && (
                            // A geo: address hands over to the phone's maps app, not a tab.
                            <ExternalCta
                                href={maps}
                                label="Open in Maps"
                                newTab={!maps.startsWith('geo:')}
                            />
                        )}
                    </>
                }
            />

            {item.can.update && editing.value && (
                <ItemSheet
                    key={editing.key}
                    list={list}
                    item={item}
                    open={editing.open}
                    onOpenChange={editing.onOpenChange}
                />
            )}
        </CornerLayout>
    );
}
