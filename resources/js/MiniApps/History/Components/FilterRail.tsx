import { router } from '@inertiajs/react';
import { gallery } from '@/routes/apps/our-history';

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

type TypeOption = {
    key: string;
    label: string;
    count?: number;
};

export default function FilterRail({
    filters,
    availableYears,
    counts,
    order,
}: Props) {
    const total = counts.photos + counts.videos;

    const typeOptions: TypeOption[] = [
        { key: 'all', label: 'All', count: total },
        { key: 'photos', label: 'Photos', count: counts.photos },
        { key: 'videos', label: 'Videos', count: counts.videos },
    ];

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

    return (
        <aside className="history-filter-rail">
            <div
                role="group"
                aria-label="Filter by media type"
                className="flex items-center gap-0.5"
            >
                <span className="history-filter-label">Type</span>
                {typeOptions.map((opt) => {
                    const isActive = filters.type === opt.key;

                    return (
                        <button
                            key={opt.key}
                            type="button"
                            onClick={() => navigate(opt.key, filters.year)}
                            aria-pressed={isActive}
                            className="history-chip"
                            style={{
                                fontWeight: isActive ? 500 : 400,
                                backgroundColor: isActive
                                    ? 'var(--history-accent)'
                                    : 'transparent',
                                color: isActive
                                    ? 'var(--history-on-accent)'
                                    : 'var(--history-ink)',
                            }}
                        >
                            {opt.label}
                            {opt.count !== undefined && (
                                <span
                                    className="history-filter-count"
                                    style={{
                                        color: isActive
                                            ? 'var(--history-on-accent)'
                                            : 'var(--history-ink-soft)',
                                    }}
                                >
                                    {opt.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {availableYears.length > 0 && (
                <div
                    role="group"
                    aria-label="Filter by year"
                    className="flex flex-wrap items-center gap-0.5"
                >
                    <span className="history-filter-label">Year</span>
                    <button
                        type="button"
                        onClick={() => navigate(filters.type, null)}
                        aria-pressed={filters.year === null}
                        className="history-chip"
                        style={{
                            fontWeight: filters.year === null ? 500 : 400,
                            backgroundColor:
                                filters.year === null
                                    ? 'var(--history-accent)'
                                    : 'transparent',
                            color:
                                filters.year === null
                                    ? 'var(--history-on-accent)'
                                    : 'var(--history-ink)',
                        }}
                    >
                        All
                    </button>
                    {availableYears.map((year) => {
                        const isActive = filters.year === year;

                        return (
                            <button
                                key={year}
                                type="button"
                                onClick={() => navigate(filters.type, year)}
                                aria-pressed={isActive}
                                className="history-chip"
                                style={{
                                    fontWeight: isActive ? 500 : 400,
                                    backgroundColor: isActive
                                        ? 'var(--history-accent)'
                                        : 'transparent',
                                    color: isActive
                                        ? 'var(--history-on-accent)'
                                        : 'var(--history-ink)',
                                }}
                            >
                                {year}
                            </button>
                        );
                    })}
                </div>
            )}
        </aside>
    );
}
