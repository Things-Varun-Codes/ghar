import { Check, ChevronDown } from 'lucide-react';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export type ChoiceItem = {
    key: string;
    label: string;
    hint?: string;
};

export type ChoiceMenuClassNames = {
    trigger: string;
    menu: string;
    item: string;
    itemLabel: string;
    hint: string;
    check: string;
};

const SHELL_CLASS_NAMES: ChoiceMenuClassNames = {
    trigger: 'shell-sort-trigger',
    menu: 'shell-sort-menu',
    item: 'shell-sort-item',
    itemLabel:
        '[font-family:var(--list-nav-font,var(--font-sans))] text-(length:--text-body)',
    hint: 'shell-sort-hint',
    check: 'text-(--shell-accent-text)',
};

type Props = {
    /* Before the colon on the trigger: "Sort", "Year". */
    label: string;
    value: string;
    items: ChoiceItem[];
    onSelect: (key: string) => void;
    /* What the trigger says for the chosen item, when not its own label. */
    valueLabel?: string;
    /* A room's own look; the shared list band's when left out. */
    classNames?: ChoiceMenuClassNames;
};

/* A "Label: value" button that opens the choices, the chosen one ticked. */
export default function ChoiceMenu({
    label,
    value,
    items,
    onSelect,
    valueLabel,
    classNames = SHELL_CLASS_NAMES,
}: Props) {
    const active = items.find((item) => item.key === value);
    const activeLabel = valueLabel ?? active?.label ?? items[0]?.label ?? '';

    function handleSelect(key: string) {
        if (key === value) {
            return;
        }

        onSelect(key);
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button type="button" className={classNames.trigger}>
                    <span>
                        {label}: {activeLabel}
                    </span>
                    <ChevronDown
                        aria-hidden="true"
                        size={14}
                        strokeWidth={1.5}
                        className="shrink-0 opacity-[0.6]"
                    />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={classNames.menu}>
                {items.map(({ key, label: itemLabel, hint }) => {
                    const isActive = key === value;

                    return (
                        <DropdownMenuItem
                            key={key}
                            onSelect={() => handleSelect(key)}
                            className={classNames.item}
                        >
                            <span>
                                <span
                                    className={cn(
                                        'block',
                                        classNames.itemLabel,
                                    )}
                                    style={{ fontWeight: isActive ? 500 : 400 }}
                                >
                                    {itemLabel}
                                </span>
                                {hint && (
                                    <span className={classNames.hint}>
                                        {hint}
                                    </span>
                                )}
                            </span>
                            {isActive && (
                                <Check
                                    aria-hidden="true"
                                    size={14}
                                    strokeWidth={1.5}
                                    className={cn('shrink-0', classNames.check)}
                                />
                            )}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
