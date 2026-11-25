import { router } from '@inertiajs/react';
import { ArrowUpRight } from 'lucide-react';
import DetailPage from '@/MiniApps/Corner/Components/DetailPage';
import ItemSheet from '@/MiniApps/Corner/Components/ItemSheet';
import ItemThumb from '@/MiniApps/Corner/Components/ItemThumb';
import type { MentionedInRef } from '@/MiniApps/Corner/Components/MentionedInList';
import { useItemActions } from '@/MiniApps/Corner/Hooks/useItemActions';
import { useSheetSession } from '@/MiniApps/Corner/Hooks/useSheetSession';
import CornerLayout from '@/MiniApps/Corner/Layouts/CornerLayout';
import { bylineOf } from '@/MiniApps/Corner/lib/copy';
import type { CornerItem, CornerListInfo } from '@/MiniApps/Corner/lib/types';
import { show as showList } from '@/routes/apps/our-shelf/lists';

type Props = {
    list: CornerListInfo;
    item: CornerItem;
    mentioned_in: MentionedInRef[];
};

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
    const editing = useSheetSession<true>();
    const listUrl = showList.url(list.slug);

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
                doneBy={item.done_by}
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
                    </>
                }
                externalCta={
                    item.url && (
                        <ExternalCta href={item.url} label="Open link" />
                    )
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
