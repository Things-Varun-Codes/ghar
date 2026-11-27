import { router } from '@inertiajs/react';
import { CalendarDays, Images, Image as Photo, Video } from 'lucide-react';

import { gallery } from '@/routes/apps/our-history';
import ChoiceMenu from '@/Shell/Components/ChoiceMenu';
import SegmentedTabs from '@/Shell/Components/SegmentedTabs';

type MediaType = 'all' | 'photos' | 'videos';

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
    filters: Filters;
    availableYears: number[];
    counts: Counts;
    order: 'newest-first' | 'oldest-first';
};

export const GALLERY_PANEL_ID = 'history-gallery-panel';

/* Type as the house's segmented tabs, drawn as icons, then the year as a menu. */
export default function FilterSegmented({
    filters,
    availableYears,
    counts,
    order,
}: Props) {
    function navigate(type: string, year: number | null) {
        const params: Record<string, string | number> = { type };

        if (year) {
            params.year = year;
        }

        if (order === 'oldest-first') {
            params.order = 'oldest-first';
        }

        router.get(gallery.url(), params, {
            preserveScroll: true,
            preserveState: true,
        });
    }

    const typeOptions = [
        {
            key: 'all' as const,
            label: 'Photos and videos',
            count: counts.photos + counts.videos,
            icon: Images,
        },
        {
            key: 'photos' as const,
            label: 'Photos',
            count: counts.photos,
            icon: Photo,
        },
        {
            key: 'videos' as const,
            label: 'Videos',
            count: counts.videos,
            icon: Video,
        },
    ];

    return (
        <>
            <SegmentedTabs
                mode="tablist-client"
                look="pill"
                ariaLabel="Filter by type"
                active={filters.type as MediaType}
                panelId={GALLERY_PANEL_ID}
                items={typeOptions}
                onChange={(type) => navigate(type, filters.year)}
            />

            {availableYears.length > 0 && (
                <YearDropdown
                    activeYear={filters.year}
                    availableYears={availableYears}
                    onSelect={(year) => navigate(filters.type, year)}
                />
            )}
        </>
    );
}

type YearDropdownProps = {
    activeYear: number | null;
    availableYears: number[];
    onSelect: (year: number | null) => void;
};

function YearDropdown({
    activeYear,
    availableYears,
    onSelect,
}: YearDropdownProps) {
    return (
        <ChoiceMenu
            label="Year"
            icon={CalendarDays}
            value={activeYear === null ? 'all' : String(activeYear)}
            valueLabel={activeYear === null ? 'All' : undefined}
            items={[
                { key: 'all', label: 'All years' },
                ...availableYears.map((y) => ({
                    key: String(y),
                    label: String(y),
                })),
            ]}
            onSelect={(key) => onSelect(key === 'all' ? null : Number(key))}
            classNames={{
                trigger: 'history-year-trigger shell-press',
                menu: 'history-year-menu',
                item: 'history-year-item',
                itemLabel: '',
                hint: '',
                check: 'text-(--history-accent-ink-strong)',
            }}
        />
    );
}
