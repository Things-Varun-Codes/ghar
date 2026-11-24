import { MapPin, MessageCircle, Play } from 'lucide-react';
import { useMemo, useRef } from 'react';
import {
    displayLocation,
    lightboxMedia,
    storyText,
} from '@/MiniApps/History/lib/moment';
import type { HistoryEvent } from '@/MiniApps/History/lib/types';
import MediaLightbox from '@/Shell/Components/MediaLightbox';
import type { MediaLightboxHandle } from '@/Shell/Components/MediaLightbox';
import PersonAvatar from '@/Shell/Components/PersonAvatar';
import BirthdayLabel from './BirthdayLabel';

type EventCardProps = {
    event: HistoryEvent;
    onRead: (id: number) => void;
};

/*
 * One moment on the Timeline, compact so a screen holds many: the date and place, the title, a
 * line of its story, then what people said. The poster's face on the rail is the card's only
 * "who", and the whole card opens the moment.
 */
export default function EventCard({ event, onRead }: EventCardProps) {
    const excerpt = useMemo(
        () => storyText(event.body_html),
        [event.body_html],
    );

    const name = event.title || event.date_label;
    const place = displayLocation(event);
    const lightboxRef = useRef<MediaLightboxHandle>(null);
    const { media, slides } = useMemo(() => lightboxMedia(event), [event]);
    // A photo waits for its thumbnail; a video shows up at once, on its poster or a blank print.
    const shownIndex = media.findIndex((m) => m.kind === 'video' || m.thumb);
    const shown = shownIndex >= 0 ? media[shownIndex] : null;
    const picture =
        shown?.kind === 'video' ? shown.poster : (shown?.card ?? shown?.thumb);
    const reacted = event.reactions.filter((r) => r.count > 0);
    const reactionTotal = reacted.reduce((sum, r) => sum + r.count, 0);
    const commentCount = event.comments.length;

    return (
        <article
            id={`event-${event.id}`}
            className="history-event-card history-moment shell-card-stretch shell-lift"
        >
            {event.creator ? (
                // The face is the only "who" on the card, so it names them: read out, and on hover.
                <span
                    className="history-timeline-face"
                    title={`Added by ${event.creator.name}`}
                >
                    <PersonAvatar
                        person={event.creator}
                        size={32}
                        decorative={false}
                    />
                </span>
            ) : (
                <span
                    aria-hidden="true"
                    className="history-timeline-dot history-timeline-marker"
                />
            )}

            <div className="history-moment-head">
                <div className="history-moment-main">
                    {(event.title || place || event.birthday_of) && (
                        <p className="history-moment-dateline">
                            {event.title && (
                                <span className="history-card-date">
                                    {event.date_label}
                                </span>
                            )}
                            {place && (
                                <span className="history-card-location">
                                    <MapPin
                                        aria-hidden="true"
                                        size={14}
                                        strokeWidth={1.5}
                                        className="shrink-0"
                                    />
                                    <span>{place}</span>
                                </span>
                            )}
                            {event.birthday_of && (
                                <BirthdayLabel person={event.birthday_of} />
                            )}
                        </p>
                    )}

                    {/* One real button, stretched over the card, opens the moment. */}
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
                        <p className="history-moment-excerpt">{excerpt}</p>
                    )}

                    {(reactionTotal > 0 || commentCount > 0) && (
                        <div className="history-moment-meta">
                            {reactionTotal > 0 && (
                                <span className="history-moment-count">
                                    <span
                                        aria-hidden="true"
                                        className="history-reaction-emoji"
                                    >
                                        {reacted.map((r) => r.emoji).join('')}
                                    </span>
                                    <span aria-hidden="true">
                                        {reactionTotal}
                                    </span>
                                    <span className="sr-only">
                                        {reactionTotal === 1
                                            ? '1 reaction'
                                            : `${reactionTotal} reactions`}
                                    </span>
                                </span>
                            )}
                            {commentCount > 0 && (
                                <span className="history-moment-count">
                                    <MessageCircle
                                        aria-hidden="true"
                                        size={14}
                                        strokeWidth={1.5}
                                    />
                                    <span aria-hidden="true">
                                        {commentCount}
                                    </span>
                                    <span className="sr-only">
                                        {commentCount === 1
                                            ? '1 comment'
                                            : `${commentCount} comments`}
                                    </span>
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {shown && (
                    <button
                        type="button"
                        aria-label={`Open ${shown.kind === 'video' ? 'the video' : 'the photo'} from ${name}`}
                        className="history-moment-thumb"
                        // Each print leans its own way, the same every visit.
                        style={{ rotate: `${(event.id % 5) - 2}deg` }}
                        onClick={() => lightboxRef.current?.open(shownIndex)}
                    >
                        {picture && (
                            <img
                                src={picture}
                                alt=""
                                loading="lazy"
                                decoding="async"
                            />
                        )}
                        {shown.kind === 'video' && (
                            <span
                                aria-hidden="true"
                                className="history-play-badge"
                            >
                                <Play
                                    size={16}
                                    strokeWidth={1.5}
                                    fill="currentColor"
                                />
                            </span>
                        )}
                    </button>
                )}
            </div>

            {shown && <MediaLightbox ref={lightboxRef} media={slides} />}
        </article>
    );
}
