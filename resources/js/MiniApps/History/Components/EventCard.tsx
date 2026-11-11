import { MapPin } from 'lucide-react';
import * as React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
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
    date: string; // 'Y-m-d' format — EventResource
    date_label: string; // 'M j, Y' format — e.g. "Jun 4, 2024"
    year: number;
    title: string | null;
    location_freetext: string | null;
    location_place_id: string | null;
    location_name: string | null;
    location_address: string | null;
    location_lat: number | null;
    location_lng: number | null;
    body_html: string | null;
    created_at: string;
    updated_at: string;
    media: MediaItem[];
    changes: Change[];
};

type EventCardProps = {
    event: HistoryEvent;
    onRead?: (id: number) => void;
};

export default function EventCard({ event, onRead }: EventCardProps) {
    const isTappable = !!onRead;
    const lightboxRef = useRef<PhotoSwipeGalleryHandle>(null);

    const bodyClampRef = useRef<HTMLDivElement>(null);
    const [isOverflowing, setIsOverflowing] = useState(false);

    useEffect(() => {
        const el = bodyClampRef.current;

        if (!el) {
            return;
        }

        const measure = () => {
            setIsOverflowing(el.scrollHeight > el.clientHeight);
        };

        measure();
        window.addEventListener('resize', measure);

        return () => window.removeEventListener('resize', measure);
    }, [event.body_html]);

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
        <article
            id={`event-${event.id}`}
            role={isTappable ? 'button' : undefined}
            tabIndex={isTappable ? 0 : undefined}
            aria-label={
                isTappable
                    ? `Read "${event.title || event.date_label}"`
                    : undefined
            }
            onClick={
                isTappable
                    ? (e: React.MouseEvent<HTMLElement>) => {
                          // Guard: don't fire card-level handler when user clicks
                          // an embedded <a> or <button> (e.g. Continue reading,
                          // markdown links). Defense-in-depth alongside the button's
                          // stopPropagation below.
                          if ((e.target as HTMLElement).closest('a, button')) {
                              return;
                          }

                          onRead?.(event.id);
                      }
                    : undefined
            }
            onKeyDown={
                isTappable
                    ? (e: React.KeyboardEvent<HTMLElement>) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onRead?.(event.id);
                          }
                      }
                    : undefined
            }
            className="history-event-card"
            style={{ ...(isTappable ? { cursor: 'pointer' } : {}) }}
        >
            <span
                aria-hidden="true"
                className="history-timeline-dot history-timeline-marker"
            />

            <header className="mb-3">
                {event.date_label && (
                    <p className="history-card-date">{event.date_label}</p>
                )}
                {event.title && (
                    <h3 className="history-card-title">{event.title}</h3>
                )}
            </header>

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
                        className="history-card-location"
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
                <div className="mb-4">
                    <div
                        ref={bodyClampRef}
                        className="history-event-body-clamp"
                    >
                        <BodyHtml html={event.body_html} />
                    </div>
                    {isOverflowing && onRead && (
                        <div className="mt-2 flex justify-end">
                            <Button
                                type="button"
                                variant="link"
                                className="history-continue-link h-auto w-auto no-underline shadow-none hover:no-underline"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRead?.(event.id);
                                }}
                                aria-label={`Continue reading "${event.title || event.date_label}"`}
                            >
                                Continue reading →
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {renderableMedia.length > 0 && (
                <div className="mb-4">
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
        </article>
    );
}
