import { Play } from 'lucide-react';

export type MediaItem = {
    id: number;
    kind: 'photo' | 'video';
    card?: string | null;
    thumb: string | null;
    medium: string | null;
    large?: string | null;
    original: string | null;
    poster: string | null;
    pending?: boolean;
    width?: number;
    height?: number;
    alt: string;
    event_title?: string;
    event_date?: string;
};

type Props = {
    media: MediaItem[];
    onClickItem?: (item: MediaItem, index: number) => void;
    /** The moment the photos belong to, so each button is named after it. */
    contextLabel?: string;
};

export default function MediaGrid({ media, onClickItem, contextLabel }: Props) {
    if (media.length === 0) {
        return null;
    }

    return (
        <div className="mt-3 grid grid-cols-[repeat(3,1fr)] gap-2">
            {media.map((item, idx) => (
                <button
                    key={item.id}
                    type="button"
                    aria-label={`${item.kind === 'video' ? 'Video' : 'Photo'} ${idx + 1} of ${media.length}${contextLabel ? ` from ${contextLabel}` : ''}`}
                    onClick={() => onClickItem?.(item, idx)}
                    className="history-media-thumb-button"
                    style={{ cursor: onClickItem ? 'zoom-in' : 'default' }}
                >
                    {item.thumb ? (
                        <img
                            src={item.thumb}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="block h-full w-full object-cover"
                        />
                    ) : item.poster ? (
                        <img
                            src={item.poster}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="block h-full w-full object-cover"
                        />
                    ) : item.pending ? (
                        <div
                            className="history-pending-tile shell-skeleton [aspect-ratio:1]"
                            aria-hidden="true"
                        />
                    ) : null}

                    {item.kind === 'video' && (
                        <span aria-hidden="true" className="history-play-badge">
                            <Play
                                size={16}
                                strokeWidth={1.5}
                                fill="currentColor"
                            />
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}
