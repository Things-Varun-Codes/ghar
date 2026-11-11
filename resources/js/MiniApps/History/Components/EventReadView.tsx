import { MapPin } from 'lucide-react';
import { useMemo, useRef } from 'react';
import ActivityStrip from './ActivityStrip';
import BodyHtml from './BodyHtml';
import MediaGrid from './MediaGrid';
import type { MediaItem } from './MediaGrid';
import PhotoSwipeGallery from './PhotoSwipeGallery';
import type {
    GalleryMediaItem,
    PhotoSwipeGalleryHandle,
} from './PhotoSwipeGallery';

type Change = {
    id: number;
    action: string;
    summary: string;
    user_name: string;
    created_at: string;
};

type HistoryEvent = {
    id: number;
    date: string;
    date_label: string;
    title: string | null;
    location_freetext: string | null;
    location_place_id: string | null;
    location_name: string | null;
    location_address: string | null;
    location_lat: number | null;
    location_lng: number | null;
    body_html: string | null;
    media: MediaItem[];
    changes: Change[];
};

type Props = {
    event: HistoryEvent;
};

export default function EventReadView({ event }: Props) {
    const lightboxRef = useRef<PhotoSwipeGalleryHandle>(null);

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
                alt: event.title
                    ? `${m.kind === 'video' ? 'Video' : 'Photo'} from ${event.title}`
                    : `${m.kind === 'video' ? 'Video' : 'Photo'} from ${event.date_label}`,
                event_title: event.title ?? undefined,
                event_date: event.date_label,
            })),
        [renderableMedia, event.title, event.date_label],
    );

    return (
        <div>
            {event.date_label && (
                <p className="history-read-date">{event.date_label}</p>
            )}

            {event.title && (
                <h2 className="history-read-title">{event.title}</h2>
            )}

            {(() => {
                const { location_name, location_address, location_freetext } =
                    event;

                let displayLocation: string | null = null;
                let isLegacy = false;

                if (
                    location_name &&
                    location_address &&
                    !location_address.includes(location_name)
                ) {
                    displayLocation = location_name;
                } else if (location_name && !location_address) {
                    displayLocation = location_name;
                } else if (location_address) {
                    displayLocation = location_address;
                } else if (location_freetext) {
                    displayLocation = location_freetext;
                    isLegacy = true;
                }

                if (!displayLocation) {
                    return null;
                }

                return (
                    <p
                        className="history-read-location"
                        style={{ fontStyle: isLegacy ? 'italic' : 'normal' }}
                    >
                        <MapPin
                            aria-hidden="true"
                            size={12}
                            strokeWidth={1.5}
                            color="var(--history-ink-soft)"
                            className="shrink-0"
                        />
                        <span>{displayLocation}</span>
                    </p>
                );
            })()}

            {event.body_html && (
                <div className="mt-4">
                    <BodyHtml html={event.body_html} />
                </div>
            )}

            {renderableMedia.length > 0 && (
                <div className="mt-4">
                    <MediaGrid
                        media={renderableMedia}
                        onClickItem={(_item, index) =>
                            lightboxRef.current?.open(index)
                        }
                    />
                </div>
            )}

            {lightboxMedia.length > 0 && (
                <PhotoSwipeGallery ref={lightboxRef} media={lightboxMedia} />
            )}

            {event.changes.length > 0 && (
                <div className="history-activity-strip-divider">
                    <ActivityStrip changes={event.changes} />
                </div>
            )}
        </div>
    );
}
