import { router } from '@inertiajs/react';
import { Images } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { captureSilent } from '@/lib/observability';
import FilterRail from '@/MiniApps/History/Components/FilterRail';
import FilterSegmented from '@/MiniApps/History/Components/FilterSegmented';
import MasonryGrid from '@/MiniApps/History/Components/MasonryGrid';
import type { GalleryMediaItem } from '@/MiniApps/History/Components/MasonryGrid';
import PhotoSwipeGallery from '@/MiniApps/History/Components/PhotoSwipeGallery';
import type { PhotoSwipeGalleryHandle } from '@/MiniApps/History/Components/PhotoSwipeGallery';
import SortDropdown from '@/MiniApps/History/Components/SortDropdown';
import { useConversionPolling } from '@/MiniApps/History/Hooks/useConversionPolling';
import HistoryLayout from '@/MiniApps/History/Layouts/HistoryLayout';
import { gallery } from '@/routes/apps/our-history';
import EmptyState from '@/Shell/Components/EmptyState';
import AppLayout from '@/Shell/Layouts/AppLayout';

type PaginatedMedia = {
    data: GalleryMediaItem[];
    current_page: number;
    last_page: number;
    next_page_url: string | null;
    total: number;
};

type Filters = {
    type: string;
    year: number | null;
};

type Counts = {
    photos: number;
    videos: number;
    events: number;
};

type Props = {
    media: PaginatedMedia;
    filters: Filters;
    available_years: number[];
    counts: Counts;
    order: 'newest-first' | 'oldest-first';
};

export default function Gallery({
    media: initialMedia,
    filters,
    available_years,
    counts,
    order,
}: Props) {
    const lightboxRef = useRef<PhotoSwipeGalleryHandle>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);

    const [accumulatedMedia, setAccumulatedMedia] = useState<
        GalleryMediaItem[]
    >(initialMedia.data);
    const [paginatorMeta, setPaginatorMeta] = useState({
        current_page: initialMedia.current_page,
        last_page: initialMedia.last_page,
        next_page_url: initialMedia.next_page_url,
    });
    const [loadingMore, setLoadingMore] = useState(false);

    // Reset on a filter or order switch only; keying on the data would reset on every appended
    // page.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- re-seeds accumulated pages from fresh Inertia props
        setAccumulatedMedia(initialMedia.data);
        setPaginatorMeta({
            current_page: initialMedia.current_page,
            last_page: initialMedia.last_page,
            next_page_url: initialMedia.next_page_url,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the query: keying on the data would reset on every appended page
    }, [order, filters.type, filters.year]);

    useEffect(() => {
        const sentinel = sentinelRef.current;

        if (!sentinel) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];

                if (
                    entry.isIntersecting &&
                    paginatorMeta.next_page_url &&
                    !loadingMore
                ) {
                    setLoadingMore(true);
                    router.get(
                        paginatorMeta.next_page_url,
                        {},
                        {
                            preserveScroll: true,
                            preserveState: true,
                            only: ['media'],
                            onSuccess: (page) => {
                                const next = page.props.media as PaginatedMedia;
                                setAccumulatedMedia((prev) => [
                                    ...prev,
                                    ...next.data,
                                ]);
                                setPaginatorMeta({
                                    current_page: next.current_page,
                                    last_page: next.last_page,
                                    next_page_url: next.next_page_url,
                                });
                                setLoadingMore(false);
                            },
                            onError: (errors) => {
                                captureSilent(
                                    new Error('gallery.load-more failed'),
                                    {
                                        component: 'History/Gallery',
                                        action: 'gallery.load-more',
                                        surface: 'frontend',
                                        extra: {
                                            payload: {
                                                next_page_url:
                                                    paginatorMeta.next_page_url,
                                                errors,
                                            },
                                        },
                                    },
                                );
                                setLoadingMore(false);
                            },
                        },
                    );
                }
            },
            { rootMargin: '200px' },
        );

        observer.observe(sentinel);

        return () => observer.disconnect();
    }, [paginatorMeta.next_page_url, loadingMore]);

    const hasPendingMedia = accumulatedMedia.some((m) => m.pending);
    useConversionPolling(hasPendingMedia, () => {
        router.reload({
            only: ['media'],
            onSuccess: (page) => {
                const fresh = (page.props.media as PaginatedMedia).data;
                const byId = new Map(fresh.map((m) => [m.id, m]));
                setAccumulatedMedia((prev) =>
                    prev.map((m) => byId.get(m.id) ?? m),
                );
            },
        });
    });

    const hasFilters = filters.type !== 'all' || filters.year !== null;

    const extraParams: Record<string, string | number> = {};

    if (filters.type !== 'all') {
        extraParams.type = filters.type;
    }

    if (filters.year) {
        extraParams.year = filters.year;
    }

    const galleryCountLine = `${counts.photos} photo${counts.photos !== 1 ? 's' : ''} · ${counts.videos} video${counts.videos !== 1 ? 's' : ''} across ${counts.events} moment${counts.events !== 1 ? 's' : ''}`;

    return (
        <AppLayout>
            <HistoryLayout
                activeTab="gallery"
                count={
                    <span className="font-sans text-(length:--text-eyebrow) text-(--history-ink-soft)">
                        {galleryCountLine}
                    </span>
                }
                controls={
                    <div className="history-gallery-controls flex items-center gap-3">
                        <FilterRail
                            filters={filters}
                            availableYears={available_years}
                            counts={counts}
                            order={order}
                        />
                        <FilterSegmented
                            filters={filters}
                            availableYears={available_years}
                            counts={counts}
                            order={order}
                        />
                        <SortDropdown
                            currentOrder={order}
                            basePath={gallery.url()}
                            extraParams={extraParams}
                        />
                    </div>
                }
            >
                <div className="history-gallery-wide min-w-0 flex-1">
                    {accumulatedMedia.length === 0 && !hasFilters && (
                        <EmptyState
                            icon={Images}
                            title="Nothing here yet."
                            body="Add photos or videos to a moment and they'll show up here."
                        />
                    )}

                    {accumulatedMedia.length === 0 && hasFilters && (
                        <EmptyState
                            icon={Images}
                            title={`No ${filters.type !== 'all' ? filters.type : 'media'}${filters.year ? ` in ${filters.year}` : ''}.`}
                            body="Clear the filter to see everything."
                            action={
                                <button
                                    type="button"
                                    onClick={() =>
                                        router.get(window.location.pathname)
                                    }
                                    className="history-clear-filters"
                                >
                                    Clear filters
                                </button>
                            }
                        />
                    )}

                    {accumulatedMedia.length > 0 && (
                        <>
                            {/* CRITICAL: pass the flat accumulatedMedia array to BOTH MasonryGrid
                                    and PhotoSwipeGallery — the SAME array reference — so the
                                    round-robin tile index stays 1:1 with the lightbox index across
                                    appended pages. Never pass the paginator object to either child. */}
                            <MasonryGrid
                                media={accumulatedMedia}
                                onTileClick={(index) =>
                                    lightboxRef.current?.open(index)
                                }
                            />

                            {loadingMore && (
                                <div className="pt-2 pb-4">
                                    {[1, 2, 3].map((i) => (
                                        <Skeleton
                                            key={i}
                                            className="history-skeleton-block"
                                        />
                                    ))}
                                </div>
                            )}

                            <div ref={sentinelRef} className="h-[1px]" />
                        </>
                    )}
                </div>

                <PhotoSwipeGallery ref={lightboxRef} media={accumulatedMedia} />
            </HistoryLayout>
        </AppLayout>
    );
}
