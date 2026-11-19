import { ChevronDown, MapPin, MessageCircle } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { displayLocation, storyText } from '@/MiniApps/History/lib/moment';
import type { HistoryEvent } from '@/MiniApps/History/lib/types';
import PersonAvatar from '@/Shell/Components/PersonAvatar';
import BirthdayLabel from './BirthdayLabel';
import BodyHtml from './BodyHtml';
import MediaGrid from './MediaGrid';
import type { MediaItem } from './MediaGrid';
import PhotoSwipeGallery from './PhotoSwipeGallery';
import type {
    GalleryMediaItem,
    PhotoSwipeGalleryHandle,
} from './PhotoSwipeGallery';

type EventCardProps = {
    event: HistoryEvent;
    onRead: (id: number) => void;
};

/*
 * One moment on the Timeline: a line of its story and quiet counts, so a screen holds many.
 * The whole card opens the sheet; "Details" opens the story and photos in place.
 */
export default function EventCard({ event, onRead }: EventCardProps) {
    const lightboxRef = useRef<PhotoSwipeGalleryHandle>(null);
    const excerptRef = useRef<HTMLParagraphElement>(null);
    const [storyCut, setStoryCut] = useState(false);

    const excerpt = useMemo(
        () => storyText(event.body_html),
        [event.body_html],
    );

    useEffect(() => {
        const el = excerptRef.current;

        if (!el) {
            return;
        }

        const measure = () => setStoryCut(el.scrollWidth > el.clientWidth + 1);

        measure();
        window.addEventListener('resize', measure);

        return () => window.removeEventListener('resize', measure);
    }, [excerpt]);

    const renderableMedia = useMemo(
        () =>
            event.media.filter(
                (m): m is MediaItem & { original: string } =>
                    m.original !== null,
            ),
        [event.media],
    );

    const lightboxMedia: GalleryMediaItem[] = useMemo(
        () =>
            renderableMedia.map((m) => ({
                id: m.id,
                kind: m.kind,
                thumb: m.thumb,
                medium: m.medium,
                original: m.original,
                poster: m.poster,
                width: m.width ?? null,
                height: m.height ?? null,
                mime_type: null,
                alt: `${m.kind === 'video' ? 'Video' : 'Photo'} from ${event.title || event.date_label}`,
                event_title: event.title ?? undefined,
                event_date: event.date_label,
            })),
        [renderableMedia, event.title, event.date_label],
    );

    const name = event.title || event.date_label;
    const place = displayLocation(event);
    const thumb = renderableMedia.find((m) => m.thumb)?.thumb ?? null;
    const reacted = event.reactions.filter((r) => r.count > 0);
    const reactionTotal = reacted.reduce((sum, r) => sum + r.count, 0);
    const commentCount = event.comments.length;
    const hasDetails = storyCut || renderableMedia.length > 0;

    return (
        <Collapsible
            render={<article />}
            id={`event-${event.id}`}
            className={cn(
                'history-event-card history-moment shell-card-stretch shell-lift',
                storyCut && 'history-moment--story-cut',
            )}
        >
            <span
                aria-hidden="true"
                className="history-timeline-dot history-timeline-marker"
            />

            <div className="history-moment-head">
                <div className="history-moment-main">
                    <p className="history-moment-dateline">
                        {event.title && (
                            <span className="history-card-date">
                                {event.date_label}
                            </span>
                        )}
                        {event.creator && (
                            <span className="history-moment-creator">
                                <PersonAvatar
                                    person={event.creator}
                                    size={20}
                                />
                                <span>{event.creator.name}</span>
                            </span>
                        )}
                    </p>

                    {/* One real button, stretched over the card, opens the moment; the
                        Details toggle and the photos keep their own clicks above it. */}
                    <h3 className="history-card-title">
                        <button
                            type="button"
                            className="shell-card-link history-card-open"
                            onClick={() => onRead(event.id)}
                        >
                            {name}
                        </button>
                    </h3>

                    {excerpt && (
                        <p ref={excerptRef} className="history-moment-excerpt">
                            {excerpt}
                        </p>
                    )}
                </div>

                {thumb && (
                    <img
                        src={thumb}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="history-moment-thumb"
                    />
                )}
            </div>

            {(place ||
                event.birthday_of ||
                reactionTotal > 0 ||
                commentCount > 0 ||
                hasDetails) && (
                <div className="history-moment-meta">
                    {event.birthday_of && (
                        <BirthdayLabel person={event.birthday_of} />
                    )}
                    {place && (
                        <p className="history-card-location">
                            <MapPin
                                aria-hidden="true"
                                size={14}
                                strokeWidth={1.5}
                                className="shrink-0"
                            />
                            <span>{place}</span>
                        </p>
                    )}
                    {reactionTotal > 0 && (
                        <p className="history-moment-count">
                            <span
                                aria-hidden="true"
                                className="history-reaction-emoji"
                            >
                                {reacted.map((r) => r.emoji).join('')}
                            </span>
                            <span aria-hidden="true">{reactionTotal}</span>
                            <span className="sr-only">
                                {reactionTotal === 1
                                    ? '1 reaction'
                                    : `${reactionTotal} reactions`}
                            </span>
                        </p>
                    )}
                    {commentCount > 0 && (
                        <p className="history-moment-count">
                            <MessageCircle
                                aria-hidden="true"
                                size={14}
                                strokeWidth={1.5}
                            />
                            <span aria-hidden="true">{commentCount}</span>
                            <span className="sr-only">
                                {commentCount === 1
                                    ? '1 comment'
                                    : `${commentCount} comments`}
                            </span>
                        </p>
                    )}
                    {hasDetails && (
                        <CollapsibleTrigger
                            className="history-moment-toggle"
                            aria-label={`Details of ${name}`}
                        >
                            Details
                            <ChevronDown
                                aria-hidden="true"
                                size={16}
                                strokeWidth={1.5}
                                className="history-moment-chevron"
                            />
                        </CollapsibleTrigger>
                    )}
                </div>
            )}

            {hasDetails && (
                <CollapsibleContent className="history-moment-details">
                    {storyCut && event.body_html && (
                        <BodyHtml
                            html={event.body_html}
                            headingBase={3}
                            links={event.links}
                        />
                    )}
                    {renderableMedia.length > 0 && (
                        <div className="history-moment-media">
                            <MediaGrid
                                media={renderableMedia}
                                contextLabel={name}
                                onClickItem={(_item, index) =>
                                    lightboxRef.current?.open(index)
                                }
                            />
                        </div>
                    )}
                </CollapsibleContent>
            )}

            {lightboxMedia.length > 0 && (
                <PhotoSwipeGallery ref={lightboxRef} media={lightboxMedia} />
            )}
        </Collapsible>
    );
}
