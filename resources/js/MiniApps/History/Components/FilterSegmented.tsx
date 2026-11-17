import { router } from '@inertiajs/react';

import { gallery } from '@/routes/apps/our-history';
import ChoiceMenu from '@/Shell/Components/ChoiceMenu';

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

export default function FilterSegmented({
    filters,
    availableYears,
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
        { key: 'all', label: 'All' },
        { key: 'photos', label: 'Photos' },
        { key: 'videos', label: 'Videos' },
    ];

    return (
        <div className="history-filter-segmented">
            <div
                role="group"
                aria-label="Filter by media type"
                className="history-segmented"
            >
                {typeOptions.map((opt) => {
                    const isActive = filters.type === opt.key;

                    return (
                        <button
                            key={opt.key}
                            type="button"
                            onClick={() => navigate(opt.key, filters.year)}
                            aria-pressed={isActive}
                            className="history-segment"
                        >
                            {opt.label}
                        </button>
                    );
                })}
            </div>

            {availableYears.length > 0 && (
                <YearDropdown
                    activeYear={filters.year}
                    availableYears={availableYears}
                    onSelect={(year) => navigate(filters.type, year)}
                />
            )}
        </div>
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
