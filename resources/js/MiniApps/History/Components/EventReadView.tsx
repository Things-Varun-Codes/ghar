import { MapPin } from 'lucide-react';
import { useMemo, useRef } from 'react';
import { displayLocation, lightboxMedia } from '@/MiniApps/History/lib/moment';
import type { EventComment, HistoryEvent } from '@/MiniApps/History/lib/types';
import MediaLightbox from '@/Shell/Components/MediaLightbox';
import type { MediaLightboxHandle } from '@/Shell/Components/MediaLightbox';
import ActivityStrip from './ActivityStrip';
import BirthdayLabel from './BirthdayLabel';
import BodyHtml from './BodyHtml';
import CommentsSection from './CommentsSection';
import MediaGrid from './MediaGrid';
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

    const { media: renderableMedia, slides: lightboxSlides } = useMemo(
        () => lightboxMedia(event),
        [event],
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

            {lightboxSlides.length > 0 && (
                <MediaLightbox ref={lightboxRef} media={lightboxSlides} />
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
