import { router } from '@inertiajs/react';
import { Check, ChevronDown } from 'lucide-react';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { buildSortHref } from '@/MiniApps/History/lib/sortUrl';

type Props = {
    currentOrder: 'newest-first' | 'oldest-first';
    basePath: string;
    extraParams?: Record<string, string | number>;
};

type SortOption = {
    order: 'newest-first' | 'oldest-first';
    label: string;
    hint: string;
};

const SORT_OPTIONS: SortOption[] = [
    {
        order: 'newest-first',
        label: 'Newest first',
        hint: 'most recent at top',
    },
    {
        order: 'oldest-first',
        label: 'From the beginning',
        hint: 'oldest first',
    },
];

export default function SortDropdown({
    currentOrder,
    basePath,
    extraParams = {},
}: Props) {
    const activeLabel =
        currentOrder === 'newest-first' ? 'Newest first' : 'From the beginning';

    function handleSelect(targetOrder: 'newest-first' | 'oldest-first') {
        if (targetOrder === currentOrder) {
            return;
        }

        const href = buildSortHref(targetOrder, basePath, extraParams);
        router.get(href, {}, { preserveScroll: true, preserveState: true });
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button type="button" className="history-sort-trigger">
                    <span>Sort: {activeLabel}</span>
                    <ChevronDown
                        aria-hidden="true"
                        size={14}
                        strokeWidth={2}
                        className="shrink-0 opacity-[0.6]"
                    />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="history-sort-menu">
                {SORT_OPTIONS.map(({ order, label, hint }) => {
                    const isActive = order === currentOrder;

                    return (
                        <DropdownMenuItem
                            key={order}
                            onSelect={() => handleSelect(order)}
                            className="history-sort-item"
                        >
                            <span>
                                <span
                                    className="block font-sans text-(length:--text-small)"
                                    style={{ fontWeight: isActive ? 500 : 400 }}
                                >
                                    {label}
                                </span>
                                <span className="history-sort-hint">
                                    {hint}
                                </span>
                            </span>
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
