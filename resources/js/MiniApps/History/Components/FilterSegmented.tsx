import { router } from '@inertiajs/react';
import { Check, ChevronDown } from 'lucide-react';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
                {typeOptions.map((opt, idx) => {
                    const isActive = filters.type === opt.key;
                    const isFirst = idx === 0;
                    const isLast = idx === typeOptions.length - 1;

                    return (
                        <button
                            key={opt.key}
                            type="button"
                            onClick={() => navigate(opt.key, filters.year)}
                            aria-pressed={isActive}
                            className="history-segment"
                            style={{
                                borderLeft: isFirst
                                    ? 'none'
                                    : '1px solid var(--history-rule)',
                                borderRadius: isFirst
                                    ? '8px 0 0 8px'
                                    : isLast
                                      ? '0 8px 8px 0'
                                      : 0,
                                fontWeight: isActive ? 600 : 400,
                                backgroundColor: isActive
                                    ? 'var(--history-accent)'
                                    : 'var(--history-card)',
                                color: isActive
                                    ? 'var(--history-on-accent)'
                                    : 'var(--history-ink)',
                            }}
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
    const activeLabel = activeYear === null ? 'All' : String(activeYear);

    const options: Array<{ key: string; label: string; year: number | null }> =
        [
            { key: 'all', label: 'All years', year: null },
            ...availableYears.map((y) => ({
                key: String(y),
                label: String(y),
                year: y,
            })),
        ];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button type="button" className="history-year-trigger">
                    <span>Year: {activeLabel}</span>
                    <ChevronDown
                        aria-hidden="true"
                        size={14}
                        strokeWidth={2}
                        className="shrink-0 opacity-[0.6]"
                    />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="history-year-menu">
                {options.map((opt) => {
                    const isActive = opt.year === activeYear;

                    return (
                        <DropdownMenuItem
                            key={opt.key}
                            onSelect={() => onSelect(opt.year)}
                            className="history-year-item"
                            style={{ fontWeight: isActive ? 500 : 400 }}
                        >
                            <span>{opt.label}</span>
                            {isActive && (
                                <Check
                                    aria-hidden="true"
                                    size={14}
                                    strokeWidth={2.5}
                                    className="shrink-0 text-(--history-accent-ink-strong)"
                                />
                            )}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
