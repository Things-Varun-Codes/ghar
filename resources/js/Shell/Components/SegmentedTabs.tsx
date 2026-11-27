import { Link } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Slide } from '@/components/motion';
import {
    Tabs,
    TabsIndicator,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';

type SegmentedTabItem<T extends string> = {
    key: T;
    label: string;
    count?: number;
    /* Drawn in place of the words, which stay as the tab's name for a screen reader. */
    icon?: LucideIcon;
};

type SegmentedTabsSharedProps<T extends string> = {
    items: Array<SegmentedTabItem<T>>;
    active: T;
    ariaLabel: string;
    /**
     * `tabs`: the page's top tabs, docked under the phone's top bar. `pill`: a filter inside a
     * tab (Gallery's photo and video icons), so the two levels don't look alike.
     */
    look?: 'tabs' | 'pill';
};

const CLASSES = {
    tabs: {
        bar: 'shell-tabbar',
        item: 'shell-tab shell-focus',
        mark: 'shell-tab-mark',
        indicator: 'shell-tab-indicator',
    },
    pill: {
        bar: 'shell-segmented',
        item: 'shell-segmented-item shell-focus',
        mark: 'shell-segmented-pill',
        indicator: 'shell-segmented-indicator',
    },
} as const;

type SegmentedTabsNavProps<T extends string> = SegmentedTabsSharedProps<T> & {
    /** Each tab is a page visit, so it is a link with aria-current, not a role=tab. */
    mode: 'nav';
    hrefFor: (key: T) => string;
    /** Keep the scroll position and drop page state on a tab change, for a filtered list. */
    keepScroll?: boolean;
    /**
     * Fetch another tab when the pointer reaches it, not as soon as this one is shown:
     * on mount, every visit paid for every tab. Only for tabs whose GET changes nothing.
     */
    prefetch?: boolean;
};

type SegmentedTabsTablistClientProps<T extends string> =
    SegmentedTabsSharedProps<T> & {
        mode: 'tablist-client';
        onChange: (key: T) => void;
        panelId?: string;
    };

export type SegmentedTabsProps<T extends string> =
    SegmentedTabsNavProps<T> | SegmentedTabsTablistClientProps<T>;

function labelText(item: SegmentedTabItem<string>): string {
    return item.count !== undefined
        ? `${item.label} (${item.count})`
        : item.label;
}

function renderLabel(
    item: SegmentedTabItem<string>,
    look: 'tabs' | 'pill',
): ReactNode {
    if (look === 'tabs' && item.count !== undefined) {
        return (
            <>
                {item.label}
                <span className="shell-tab-count">{item.count}</span>
            </>
        );
    }

    if (!item.icon) {
        return labelText(item);
    }

    const Icon = item.icon;

    return (
        <>
            <Icon aria-hidden="true" size={18} strokeWidth={1.5} />
            <span className="sr-only">{labelText(item)}</span>
        </>
    );
}

export default function SegmentedTabs<T extends string>(
    props: SegmentedTabsProps<T>,
) {
    const { items, active, ariaLabel, look = 'tabs' } = props;
    const css = CLASSES[look];

    if (props.mode === 'tablist-client') {
        const { onChange, panelId } = props;

        // Arrows move focus and Enter or a click chooses: each choice is a server visit, so
        // arrowing across must not fire one per key. The mark glides to the chosen tab.
        return (
            <Tabs
                value={active}
                onValueChange={(value) => onChange(value as T)}
                className="contents"
            >
                <TabsList aria-label={ariaLabel} className={css.bar}>
                    {items.map((item) => (
                        <TabsTrigger
                            key={item.key}
                            value={item.key}
                            aria-controls={panelId}
                            className={css.item}
                        >
                            {renderLabel(item, look)}
                        </TabsTrigger>
                    ))}
                    <TabsIndicator className={css.indicator} />
                </TabsList>
            </Tabs>
        );
    }

    const { hrefFor, prefetch = false, keepScroll = false } = props;

    return (
        <nav aria-label={ariaLabel} className={css.bar}>
            {items.map((item) => {
                const isActive = item.key === active;

                return (
                    <Link
                        key={item.key}
                        href={hrefFor(item.key)}
                        prefetch={prefetch && !isActive ? 'hover' : false}
                        preserveScroll={keepScroll}
                        preserveState={keepScroll ? false : undefined}
                        aria-current={isActive ? 'page' : undefined}
                        data-active={isActive ? '' : undefined}
                        className={css.item}
                    >
                        {/* Each tab is a page visit: the shared layoutId glides the mark from the last page's tabs. */}
                        {isActive && (
                            <Slide
                                as="span"
                                layoutId={`segmented-pill:${ariaLabel}`}
                                resize
                                className={css.mark}
                            />
                        )}
                        {renderLabel(item, look)}
                    </Link>
                );
            })}
        </nav>
    );
}
