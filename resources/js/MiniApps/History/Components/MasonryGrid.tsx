import { useEffect, useState } from 'react';

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

function getColumnCount(): number {
    if (window.matchMedia('(max-width: 700px)').matches) {
        return 2;
    }

    if (window.matchMedia('(max-width: 1100px)').matches) {
        return 3;
    }

    if (window.matchMedia('(min-width: 1600px)').matches) {
        return 5;
    }

    return 4;
}

export default function MasonryGrid({ media, onTileClick }: Props) {
    const [colCount, setColCount] = useState(4);

    useEffect(() => {
        const mq700 = window.matchMedia('(max-width: 700px)');
        const mq1100 = window.matchMedia('(max-width: 1100px)');
        const mq1600 = window.matchMedia('(min-width: 1600px)');

        const handleChange = () => {
            setColCount(getColumnCount());
        };

        mq700.addEventListener('change', handleChange);
        mq1100.addEventListener('change', handleChange);
        mq1600.addEventListener('change', handleChange);

        handleChange();

        return () => {
            mq700.removeEventListener('change', handleChange);
            mq1100.removeEventListener('change', handleChange);
            mq1600.removeEventListener('change', handleChange);
        };
    }, []);

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
                    className="history-pending-tile"
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
                    ▶
                </span>
            )}
        </button>
    );
}
