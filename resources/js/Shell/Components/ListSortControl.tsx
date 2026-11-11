import { Check, ChevronDown } from 'lucide-react';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type SortItem = {
    key: string;
    label: string;
    hint?: string;
};

type Props = {
    sort: string;
    items: SortItem[];
    onSelect: (key: string) => void;
};

export default function ListSortControl({ sort, items, onSelect }: Props) {
    const active = items.find((item) => item.key === sort);
    const activeLabel = active?.label ?? items[0]?.label ?? '';

    function handleSelect(key: string) {
        if (key === sort) {
            return;
        }

        onSelect(key);
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button type="button" className="shell-sort-trigger">
                    <span>Sort: {activeLabel}</span>
                    <ChevronDown
                        aria-hidden="true"
                        size={14}
                        strokeWidth={2}
                        className="shrink-0 opacity-[0.6]"
                    />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="shell-sort-menu">
                {items.map(({ key, label, hint }) => {
                    const isActive = key === sort;

                    return (
                        <DropdownMenuItem
                            key={key}
                            onSelect={() => handleSelect(key)}
                            className="shell-sort-item"
                        >
                            <span>
                                <span
                                    className="block [font-family:var(--list-nav-font,var(--font-sans))] text-(length:--text-body)"
                                    style={{ fontWeight: isActive ? 500 : 400 }}
                                >
                                    {label}
                                </span>
                                {hint && (
                                    <span className="shell-sort-hint">
                                        {hint}
                                    </span>
                                )}
                            </span>
                            {isActive && (
                                <Check
                                    aria-hidden="true"
                                    size={14}
                                    strokeWidth={2.5}
                                    className="shrink-0 text-(--shell-accent-text)"
                                />
                            )}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
