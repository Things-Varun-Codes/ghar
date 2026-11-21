import { router } from '@inertiajs/react';
import { ArrowDownUp } from 'lucide-react';

import { buildSortHref } from '@/MiniApps/History/lib/sortUrl';
import type { ChoiceItem } from '@/Shell/Components/ChoiceMenu';
import ChoiceMenu from '@/Shell/Components/ChoiceMenu';

type Order = 'newest-first' | 'oldest-first';

type Props = {
    currentOrder: Order;
    basePath: string;
    extraParams?: Record<string, string | number>;
};

const SORT_OPTIONS: ChoiceItem[] = [
    {
        key: 'newest-first',
        label: 'Newest first',
        hint: 'most recent at top',
    },
    {
        key: 'oldest-first',
        label: 'From the beginning',
        hint: 'oldest first',
    },
];

export default function SortDropdown({
    currentOrder,
    basePath,
    extraParams = {},
}: Props) {
    return (
        <ChoiceMenu
            label="Sort"
            icon={ArrowDownUp}
            value={currentOrder}
            items={SORT_OPTIONS}
            onSelect={(order) => {
                router.get(
                    buildSortHref(order as Order, basePath, extraParams),
                    {},
                    { preserveScroll: true, preserveState: true },
                );
            }}
            classNames={{
                trigger: 'history-sort-trigger shell-press',
                menu: 'history-sort-menu',
                item: 'history-sort-item',
                itemLabel: 'font-sans text-(length:--text-small)',
                hint: 'history-sort-hint',
                check: 'text-(--history-accent-ink-strong)',
            }}
        />
    );
}
