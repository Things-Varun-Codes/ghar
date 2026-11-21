import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
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

type TriggerProps =
    | {
          /* Drawn on the button in place of the label. */
          icon: LucideIcon;
          trigger?: never;
      }
    | {
          /* The button's own content, which names it (a timeline's year heading). */
          trigger: ReactNode;
          icon?: never;
      };

type Props = TriggerProps & {
    /* What the control is: "Sort", "Year". The icon button's name, read out with the choice. */
    label: string;
    value: string;
    items: ChoiceItem[];
    onSelect: (key: string) => void;
    /* What the trigger says for the chosen item, when not its own label. */
    valueLabel?: string;
    /* A room's own look; the shared list band's when left out. */
    classNames?: ChoiceMenuClassNames;
    /* Which edge of the button the menu lines up with. */
    align?: 'start' | 'end';
    /*
     * Choosing moves the page (a jump to a year): the menu doesn't lock the page's scroll, and
     * focus doesn't go back to the button, which would scroll back to it.
     */
    movesPage?: boolean;
};

/*
 * An icon button that opens the choices as radio items, the chosen one ticked. At the first
 * choice (the default) it is the icon alone; any other choice is also written beside it, so a
 * list that has been narrowed or reordered says so.
 */
export default function ChoiceMenu({
    label,
    icon: Icon,
    trigger,
    value,
    items,
    onSelect,
    valueLabel,
    classNames = SHELL_CLASS_NAMES,
    align = 'end',
    movesPage = false,
}: Props) {
    const active = items.find((item) => item.key === value);
    const activeLabel = valueLabel ?? active?.label ?? items[0]?.label ?? '';
    const isDefault = value === items[0]?.key;

    function handleSelect(key: string) {
        if (key === value) {
            return;
        }

        onSelect(key);
    }

    return (
        <DropdownMenu modal={!movesPage}>
            {Icon ? (
                <DropdownMenuTrigger
                    className={classNames.trigger}
                    aria-label={`${label}: ${activeLabel}`}
                    data-icon-only={isDefault ? '' : undefined}
                >
                    <Icon
                        aria-hidden="true"
                        size={18}
                        strokeWidth={1.5}
                        className="shrink-0"
                    />
                    {!isDefault && (
                        <span aria-hidden="true">{activeLabel}</span>
                    )}
                </DropdownMenuTrigger>
            ) : (
                <DropdownMenuTrigger className={classNames.trigger}>
                    {trigger}
                </DropdownMenuTrigger>
            )}
            <DropdownMenuContent
                align={align}
                finalFocus={!movesPage}
                className={classNames.menu}
            >
                <DropdownMenuRadioGroup
                    value={value}
                    onValueChange={(next) => handleSelect(String(next))}
                >
                    {items.map(({ key, label: itemLabel, hint }) => (
                        <DropdownMenuRadioItem
                            key={key}
                            value={key}
                            closeOnClick
                            className={cn('group/choice', classNames.item)}
                            indicatorClassName={classNames.check}
                        >
                            <span>
                                <span
                                    className={cn(
                                        'block font-normal group-data-checked/choice:font-medium',
                                        classNames.itemLabel,
                                    )}
                                >
                                    {itemLabel}
                                </span>
                                {hint && (
                                    <span className={classNames.hint}>
                                        {hint}
                                    </span>
                                )}
                            </span>
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
