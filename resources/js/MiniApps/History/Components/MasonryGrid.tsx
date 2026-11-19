import { Play } from 'lucide-react';
import { useMediaQuery } from 'usehooks-ts';
import { useIsPhone } from '@/hooks/use-breakpoint';

export type GalleryMediaItem = {
    id: number;
    kind: 'photo' | 'video';
    thumb: string | null;
    medium: string | null;
    original: string;
    poster: string | null;
    pending?: boolean;
    width?: number | null;
    height?: number | null;
    mime_type?: string | null;
    alt: string;
    event_title?: string;
    event_date?: string;
};

type Props = {
    media: GalleryMediaItem[];
    onTileClick: (index: number) => void;
};

export default function MasonryGrid({ media, onTileClick }: Props) {
    // Read synchronously on the first render, so the grid never mounts at one column count and
    // reflows to another.
    const phone = useIsPhone();
    const tablet = useMediaQuery('(max-width: 1279.98px)');
    const wide = useMediaQuery('(min-width: 1536px)');
    const colCount = phone ? 2 : tablet ? 3 : wide ? 5 : 4;

    if (media.length === 0) {
        return null;
    }

    const columns: Array<
        Array<{ item: GalleryMediaItem; originalIndex: number }>
    > = Array.from({ length: colCount }, () => []);

    media.forEach((item, i) => {
        columns[i % colCount].push({ item, originalIndex: i });
    });

    return (
        <div className="history-masonry flex gap-2">
            {columns.map((col, colIdx) => (
                <div
                    key={colIdx}
                    className="flex min-w-0 flex-1 flex-col gap-2"
                >
                    {col.map(({ item, originalIndex }) => (
                        <MasonryTile
                            key={item.id}
                            item={item}
                            index={originalIndex}
                            onTileClick={onTileClick}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}

type TileProps = {
    item: GalleryMediaItem;
    index: number;
    onTileClick: (index: number) => void;
};

function MasonryTile({ item, index, onTileClick }: TileProps) {
    const thumbSrc =
        item.kind === 'video'
            ? (item.poster ?? item.thumb ?? item.medium ?? undefined)
            : (item.thumb ?? item.medium ?? item.original);
    const isPendingPhoto =
        item.kind === 'photo' && Boolean(item.pending) && !item.thumb;
    const label = item.alt
        ? `Open ${item.alt}`
        : item.kind === 'video'
          ? 'Open video'
          : 'Open photo';

    return (
        <button
            type="button"
            aria-label={label}
            onClick={() => onTileClick(index)}
            className="history-masonry-tile history-masonry-button"
        >
            {isPendingPhoto ? (
                <div
                    className="history-pending-tile shell-skeleton"
                    aria-hidden="true"
                    style={{
                        aspectRatio:
                            item.width && item.height
                                ? `${item.width} / ${item.height}`
                                : '1',
                    }}
                />
            ) : (
                <img
                    src={thumbSrc}
                    alt={item.alt || ''}
                    width={item.width ?? undefined}
                    height={item.height ?? undefined}
                    loading="lazy"
                    decoding="async"
                    className="block h-auto w-full"
                />
            )}

            <span
                aria-hidden="true"
                className="history-masonry-tile__caption history-masonry-caption"
            >
                {item.event_title && (
                    <span className="block font-medium">
                        {item.event_title}
                    </span>
                )}
                {item.event_date && (
                    <span className="block opacity-[0.85]">
                        {item.event_date}
                    </span>
                )}
            </span>

            {item.kind === 'video' && (
                <span aria-hidden="true" className="history-masonry-play">
                    <Play size={28} strokeWidth={1.5} fill="currentColor" />
                </span>
            )}
        </button>
    );
}
