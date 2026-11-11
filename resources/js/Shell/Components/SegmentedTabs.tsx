import { Link, router } from '@inertiajs/react';

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
    mode: 'nav';
    hrefFor: (key: T) => string;
};

type SegmentedTabsTablistUrlProps<T extends string> =
    SegmentedTabsSharedProps<T> & {
        mode: 'tablist-url';
        hrefFor: (key: T) => string;
    };

type SegmentedTabsTablistClientProps<T extends string> =
    SegmentedTabsSharedProps<T> & {
        mode: 'tablist-client';
        onChange: (key: T) => void;
        panelId?: string;
    };

export type SegmentedTabsProps<T extends string> =
    | SegmentedTabsNavProps<T>
    | SegmentedTabsTablistUrlProps<T>
    | SegmentedTabsTablistClientProps<T>;

function itemStyle(isActive: boolean): React.CSSProperties {
    return {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-sans)',
        fontSize: '14px',
        fontWeight: isActive ? 500 : 400,
        color: isActive ? 'var(--shell-accent-fg)' : 'var(--shell-text-muted)',
        backgroundColor: isActive ? 'var(--shell-accent)' : 'transparent',
        textDecoration: 'none',
        border: 'none',
        borderRadius: '999px',
        padding: '6px 16px',
        minHeight: '38px',
        cursor: isActive ? 'default' : 'pointer',
        transition: 'background-color 0.1s ease, color 0.1s ease',
        whiteSpace: 'nowrap',
    };
}

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

    if (props.mode === 'nav') {
        const { hrefFor } = props;

        return (
            <nav aria-label={ariaLabel} className={wrapperClassName}>
                {items.map((item) => {
                    const isActive = item.key === active;

                    return (
                        <Link
                            key={item.key}
                            href={hrefFor(item.key)}
                            aria-current={isActive ? 'page' : undefined}
                            data-active={isActive ? '' : undefined}
                            style={itemStyle(isActive)}
                        >
                            {renderLabel(item)}
                        </Link>
                    );
                })}
            </nav>
        );
    }

    if (props.mode === 'tablist-url') {
        const { hrefFor } = props;

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
                            data-active={isActive ? '' : undefined}
                            onClick={() =>
                                router.visit(hrefFor(item.key), {
                                    preserveScroll: true,
                                    preserveState: false,
                                })
                            }
                            style={itemStyle(isActive)}
                        >
                            {renderLabel(item)}
                        </button>
                    );
                })}
            </div>
        );
    }

    const { onChange, panelId } = props;

    return (
        <div role="tablist" aria-label={ariaLabel} className={wrapperClassName}>
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
                        style={itemStyle(isActive)}
                    >
                        {renderLabel(item)}
                    </button>
                );
            })}
        </div>
    );
}
