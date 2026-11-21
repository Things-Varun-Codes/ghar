import { MapPin } from 'lucide-react';
import { useMemo, useRef } from 'react';
import { displayLocation } from '@/MiniApps/History/lib/moment';
import type { EventComment, HistoryEvent } from '@/MiniApps/History/lib/types';
import MediaLightbox from '@/Shell/Components/MediaLightbox';
import type {
    LightboxItem,
    MediaLightboxHandle,
} from '@/Shell/Components/MediaLightbox';
import ActivityStrip from './ActivityStrip';
import BirthdayLabel from './BirthdayLabel';
import BodyHtml from './BodyHtml';
import CommentsSection from './CommentsSection';
import MediaGrid from './MediaGrid';
import type { MediaItem } from './MediaGrid';
import ReactionsRow from './ReactionsRow';

type Props = {
    event: HistoryEvent;
    commentDraft: string;
    onCommentDraftChange: (draft: string) => void;
    onDeleteComment: (comment: EventComment) => void;
};

export default function EventReadView({
    event,
    commentDraft,
    onCommentDraftChange,
    onDeleteComment,
}: Props) {
    const lightboxRef = useRef<MediaLightboxHandle>(null);

    const renderableMedia = useMemo(
        () =>
            event.media.filter(
                (m): m is MediaItem & { original: string } =>
                    m.original !== null,
            ),
        [event.media],
    );

    const lightboxMedia: LightboxItem[] = useMemo(
        () =>
            renderableMedia.map((m) => ({
                kind: m.kind,
                medium: m.medium,
                large: m.large,
                original: m.original,
                poster: m.poster,
                width: m.width,
                height: m.height,
                alt: event.title
                    ? `${m.kind === 'video' ? 'Video' : 'Photo'} from ${event.title}`
                    : `${m.kind === 'video' ? 'Video' : 'Photo'} from ${event.date_label}`,
                title: event.title ?? undefined,
                subtitle: event.date_label,
            })),
        [renderableMedia, event.title, event.date_label],
    );

    const place = displayLocation(event);

    return (
        <div>
            {event.date_label && (
                <p className="history-read-date">{event.date_label}</p>
            )}

            {event.title && (
                <h2 className="history-read-title">{event.title}</h2>
            )}

            {event.birthday_of && (
                <div className="mt-3">
                    <BirthdayLabel person={event.birthday_of} />
                </div>
            )}

            {place && (
                <p className="history-read-location">
                    <MapPin
                        aria-hidden="true"
                        size={14}
                        strokeWidth={1.5}
                        color="var(--history-ink-soft)"
                        className="shrink-0"
                    />
                    <span>{place}</span>
                </p>
            )}

            {event.body_html && (
                <div className="mt-6">
                    <BodyHtml
                        html={event.body_html}
                        headingBase={2}
                        links={event.links}
                    />
                </div>
            )}

            {renderableMedia.length > 0 && (
                <div className="mt-4">
                    <MediaGrid
                        media={renderableMedia}
                        contextLabel={event.title || event.date_label}
                        onClickItem={(_item, index) =>
                            lightboxRef.current?.open(index)
                        }
                    />
                </div>
            )}

            {lightboxMedia.length > 0 && (
                <MediaLightbox ref={lightboxRef} media={lightboxMedia} />
            )}

            <ReactionsRow event={event} />

            <CommentsSection
                event={event}
                draft={commentDraft}
                onDraftChange={onCommentDraftChange}
                onDelete={onDeleteComment}
            />

            {event.changes.length > 0 && (
                <div className="history-activity-strip-divider">
                    <ActivityStrip changes={event.changes} />
                </div>
            )}
        </div>
    );
}
