import { Link } from '@inertiajs/react';

type SegmentedTabItem<T extends string> = {
    key: T;
    label: string;
    count?: number;
};

type SegmentedTabsSharedProps<T extends string> = {
    items: Array<SegmentedTabItem<T>>;
    active: T;
    ariaLabel: string;
    className?: string;
};

type SegmentedTabsNavProps<T extends string> = SegmentedTabsSharedProps<T> & {
    /**
     * Each tab is a page visit, so it is a link with aria-current, not a role=tab.
     * 'tablist-url' is the old name for the same thing; it keeps the scroll position and
     * drops page state, as the list pages that used it expect.
     */
    mode: 'nav' | 'tablist-url';
    hrefFor: (key: T) => string;
    /**
     * Fetch the other tabs as soon as this one is shown. Only for tabs whose GET
     * changes nothing on the server.
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

function renderLabel(item: SegmentedTabItem<string>): string {
    return item.count !== undefined
        ? `${item.label} (${item.count})`
        : item.label;
}

export default function SegmentedTabs<T extends string>(
    props: SegmentedTabsProps<T>,
) {
    const { items, active, ariaLabel, className } = props;
    const wrapperClassName = ['segmented-tabs', 'shell-segmented', className]
        .filter(Boolean)
        .join(' ');

    if (props.mode === 'tablist-client') {
        const { onChange, panelId } = props;

        return (
            <div
                role="tablist"
                aria-label={ariaLabel}
                className={wrapperClassName}
            >
                {items.map((item) => {
                    const isActive = item.key === active;

                    return (
                        <button
                            key={item.key}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            aria-controls={panelId}
                            data-active={isActive ? '' : undefined}
                            onClick={() => onChange(item.key)}
                            className="shell-segmented-item shell-focus"
                        >
                            {renderLabel(item)}
                        </button>
                    );
                })}
            </div>
        );
    }

    const { hrefFor, prefetch = false } = props;
    const keepScroll = props.mode === 'tablist-url';

    return (
        <nav aria-label={ariaLabel} className={wrapperClassName}>
            {items.map((item) => {
                const isActive = item.key === active;

                return (
                    <Link
                        key={item.key}
                        href={hrefFor(item.key)}
                        prefetch={prefetch && !isActive ? 'mount' : false}
                        preserveScroll={keepScroll}
                        preserveState={keepScroll ? false : undefined}
                        aria-current={isActive ? 'page' : undefined}
                        data-active={isActive ? '' : undefined}
                        className="shell-segmented-item shell-focus"
                    >
                        {renderLabel(item)}
                    </Link>
                );
            })}
        </nav>
    );
}
