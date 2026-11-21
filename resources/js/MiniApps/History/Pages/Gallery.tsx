import { router } from '@inertiajs/react';
import { Images } from 'lucide-react';
import { useRef } from 'react';

import { count } from '@/lib/plural';
import FilterSegmented, {
    GALLERY_PANEL_ID,
} from '@/MiniApps/History/Components/FilterSegmented';
import MasonryGrid from '@/MiniApps/History/Components/MasonryGrid';
import type { GalleryMediaItem } from '@/MiniApps/History/Components/MasonryGrid';
import PhotoSwipeGallery from '@/MiniApps/History/Components/PhotoSwipeGallery';
import type { PhotoSwipeGalleryHandle } from '@/MiniApps/History/Components/PhotoSwipeGallery';
import SortDropdown from '@/MiniApps/History/Components/SortDropdown';
import { useConversionPolling } from '@/MiniApps/History/Hooks/useConversionPolling';
import HistoryLayout from '@/MiniApps/History/Layouts/HistoryLayout';
import { gallery } from '@/routes/apps/our-history';
import EmptyState from '@/Shell/Components/EmptyState';
import ListLoadMoreState from '@/Shell/Components/ListLoadMoreState';
import { useCursorPagination } from '@/Shell/Hooks/useCursorPagination';

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

    const {
        items: loadedMedia,
        sentinelRef,
        loadingMore,
        loadError,
        retryLoadMore,
        refreshInPlace,
    } = useCursorPagination<GalleryMediaItem>({
        initial: initialMedia,
        propName: 'media',
    });

    useConversionPolling(
        loadedMedia.some((m) => m.pending),
        refreshInPlace,
    );

    const hasFilters = filters.type !== 'all' || filters.year !== null;

    const extraParams: Record<string, string | number> = {};

    if (filters.type !== 'all') {
        extraParams.type = filters.type;
    }

    if (filters.year) {
        extraParams.year = filters.year;
    }

    // A kind with none is left out: "25 photos across 26 moments", not "· 0 videos".
    const kinds = [
        counts.photos > 0 && count(counts.photos, 'photo'),
        counts.videos > 0 && count(counts.videos, 'video'),
    ].filter(Boolean);
    const galleryCountLine =
        kinds.length > 0
            ? `${kinds.join(' · ')} across ${count(counts.events, 'moment')}`
            : '';

    return (
        <HistoryLayout
            activeTab="gallery"
            count={
                <span className="font-sans text-(length:--text-body) text-(--history-ink-soft)">
                    {galleryCountLine}
                </span>
            }
            controls={
                <div className="history-gallery-controls flex items-center gap-3">
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
            <div
                id={GALLERY_PANEL_ID}
                role="tabpanel"
                className="history-gallery-wide min-w-0 flex-1"
            >
                {loadedMedia.length === 0 && !hasFilters && (
                    <EmptyState
                        icon={Images}
                        title="No photos or videos yet."
                        body="Add photos or videos to a moment and they'll show up here."
                    />
                )}

                {loadedMedia.length === 0 && hasFilters && (
                    <EmptyState
                        icon={Images}
                        title={`No ${filters.type !== 'all' ? filters.type : 'photos or videos'}${filters.year ? ` in ${filters.year}` : ''}.`}
                        action={
                            <button
                                type="button"
                                onClick={() =>
                                    router.get(window.location.pathname)
                                }
                                className="history-clear-filters shell-press"
                            >
                                Clear filters
                            </button>
                        }
                    />
                )}

                {loadedMedia.length > 0 && (
                    <>
                        {/* CRITICAL: pass the flat loadedMedia array to BOTH MasonryGrid
                                and PhotoSwipeGallery — the SAME array reference — so the
                                round-robin tile index stays 1:1 with the lightbox index across
                                appended pages. Never pass the paginator object to either child. */}
                        <MasonryGrid
                            media={loadedMedia}
                            onTileClick={(index) =>
                                lightboxRef.current?.open(index)
                            }
                        />

                        <ListLoadMoreState
                            loadingMore={loadingMore}
                            loadError={loadError}
                            onRetry={retryLoadMore}
                            sentinelRef={sentinelRef}
                        />
                    </>
                )}
            </div>

            <PhotoSwipeGallery ref={lightboxRef} media={loadedMedia} />
        </HistoryLayout>
    );
}
