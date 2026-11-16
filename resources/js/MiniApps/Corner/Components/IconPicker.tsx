import * as Sentry from '@sentry/react';
import { ChevronDown, Search } from 'lucide-react';
import type { KeyboardEvent, ReactNode } from 'react';
import {
    useCallback,
    useEffect,
    useId,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetTitle,
} from '@/components/ui/sheet';
import { useIsPhone } from '@/hooks/use-breakpoint';
import { useOverlayHistory } from '@/hooks/use-overlay-history';
import { cn } from '@/lib/utils';
import type { Row, Section } from '@/MiniApps/Corner/lib/icon-picker';
import {
    CELL,
    HEADING_HEIGHT,
    ROW_HEIGHT,
    SUGGESTED,
    columnsFor,
    layoutRows,
    moveActive,
    recentIcons,
    rememberIcon,
    searchIcons,
    sectionAt,
    visibleRows,
} from '@/MiniApps/Corner/lib/icon-picker';
import { ListIcon } from '@/MiniApps/Corner/lib/list-icons';
import ErrorState from '@/Shell/Components/ErrorState';
import LoadingState from '@/Shell/Components/LoadingState';
import type { IconIndex, IconPaths } from '@/Shell/linkables/lucide';
import {
    iconLabel,
    loadIconIndex,
    loadIconPaths,
} from '@/Shell/linkables/lucide';

type Props = {
    value: string;
    onChange: (icon: string) => void;
    /* Labels the trigger, for a picker that sits under a visible label. */
    labelledBy?: string;
};

type Catalog = { paths: IconPaths; index: IconIndex };

function preload(): void {
    // Warming the chunks on hover or focus makes the panel open full.
    void loadIconPaths().catch(() => undefined);
    void loadIconIndex().catch(() => undefined);
}

/*
 * The icon picker: a button showing the current icon that opens a compact panel (a popover on a
 * wide screen, a sheet on a phone). The panel searches every lucide icon by name and tag, and
 * browses them by category in one virtualised grid. Keyboard: type to search, arrows to move,
 * Enter to choose, Escape to close; focus returns to the button.
 */
export default function IconPicker({ value, onChange, labelledBy }: Props) {
    const [open, setOpen] = useState(false);
    const isPhone = useIsPhone();
    const trigger = useRef<HTMLButtonElement>(null);
    const titleId = useId();

    useOverlayHistory(open, () => setOpen(false));

    const choose = (icon: string) => {
        rememberIcon(icon);
        onChange(icon);
        setOpen(false);
    };

    const button = (
        <button
            ref={trigger}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-labelledby={
                labelledBy ? `${labelledBy} ${titleId}` : undefined
            }
            onPointerEnter={preload}
            onFocus={preload}
            onClick={() => setOpen(true)}
            className="corner-icon-trigger shell-press"
        >
            <span className="corner-icon-trigger-mark">
                <ListIcon name={value} size={22} strokeWidth={1.5} />
            </span>
            <span id={titleId} className="corner-icon-trigger-name">
                {iconLabel(value)}
            </span>
            <span className="corner-icon-trigger-action">
                Change
                <ChevronDown aria-hidden="true" size={16} strokeWidth={1.5} />
            </span>
        </button>
    );

    const panel = <IconPanel value={value} onChoose={choose} roomy={isPhone} />;

    if (isPhone) {
        return (
            <>
                {button}
                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetContent
                        side="bottom"
                        className="corner-icon-sheet h-[80dvh] gap-0 p-0"
                        onCloseAutoFocus={(event) => {
                            event.preventDefault();
                            trigger.current?.focus();
                        }}
                    >
                        <SheetTitle className="corner-icon-sheet-title">
                            Choose an icon
                        </SheetTitle>
                        <SheetDescription className="sr-only">
                            Search or browse every icon, then choose one.
                        </SheetDescription>
                        {panel}
                    </SheetContent>
                </Sheet>
            </>
        );
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>{button}</PopoverTrigger>
            <PopoverContent
                align="start"
                className="corner-icon-popover w-[372px] p-0"
                role="dialog"
                aria-label="Choose an icon"
                // The panel focuses its own search field.
                onOpenAutoFocus={(event) => event.preventDefault()}
            >
                {panel}
            </PopoverContent>
        </Popover>
    );
}

function IconPanel({
    value,
    onChoose,
    roomy,
}: {
    value: string;
    onChoose: (icon: string) => void;
    roomy: boolean;
}) {
    const [catalog, setCatalog] = useState<Catalog | null>(null);
    const [failed, setFailed] = useState(false);
    const search = useRef<HTMLInputElement>(null);

    const fetchCatalog = useCallback(() => {
        Promise.all([loadIconPaths(), loadIconIndex()])
            .then(([paths, index]) => setCatalog({ paths, index }))
            .catch((error: unknown) => {
                Sentry.captureException(error, {
                    tags: {
                        component: 'Corner/IconPicker',
                        action: 'load-icons',
                    },
                });
                setFailed(true);
            });
    }, []);

    useEffect(fetchCatalog, [fetchCatalog]);

    const retry = () => {
        setFailed(false);
        fetchCatalog();
    };

    let body: ReactNode;

    if (catalog) {
        body = (
            <IconBrowser
                catalog={catalog}
                value={value}
                onChoose={onChoose}
                searchRef={search}
            />
        );
    } else if (failed) {
        body = (
            <div className="corner-icon-state">
                <ErrorState
                    variant="inline"
                    message="Couldn't load the icons."
                    onRetry={retry}
                />
            </div>
        );
    } else {
        body = (
            <div className="corner-icon-state" aria-busy="true">
                <LoadingState rows={4} variant="list" />
            </div>
        );
    }

    return (
        <div
            className={cn(
                'corner-icon-panel',
                roomy && 'corner-icon-panel--roomy',
            )}
        >
            {!catalog && (
                <div className="corner-icon-search">
                    <Search aria-hidden="true" size={16} strokeWidth={1.5} />
                    <Input
                        ref={search}
                        type="search"
                        aria-label="Search icons"
                        placeholder="Search icons"
                        disabled
                    />
                </div>
            )}
            {body}
        </div>
    );
}

function IconBrowser({
    catalog,
    value,
    onChoose,
    searchRef,
}: {
    catalog: Catalog;
    value: string;
    onChoose: (icon: string) => void;
    searchRef: React.RefObject<HTMLInputElement | null>;
}) {
    const ids = useId();
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(-1);
    const [scrollTop, setScrollTop] = useState(0);
    const [size, setSize] = useState({ width: 344, height: 300 });
    const scroller = useRef<HTMLDivElement>(null);

    // The grid shows each icon once, by its own name; a list may hold an older alias of it.
    const canonical = useCallback(
        (name: string) => catalog.paths.aliases[name] ?? name,
        [catalog],
    );
    const chosen = canonical(value);

    // Read when the panel opens: choosing an icon closes it, so this row never goes stale.
    const [firstRow] = useState(() =>
        [
            ...new Set([value, ...recentIcons(), ...SUGGESTED].map(canonical)),
        ].filter((name) => name in catalog.paths.paths),
    );

    useEffect(() => {
        searchRef.current?.focus();
    }, [searchRef]);

    const names = useMemo(
        () => Object.keys(catalog.paths.paths).sort(),
        [catalog],
    );

    const sections = useMemo<Section[]>(() => {
        const trimmed = query.trim();

        if (trimmed !== '') {
            const found = searchIcons(catalog.index, names, trimmed);

            return [
                {
                    key: 'results',
                    title: `${found.length} ${found.length === 1 ? 'icon' : 'icons'}`,
                    icons: found,
                },
            ];
        }

        return [
            {
                key: 'suggested',
                title: 'Recent and suggested',
                icons: firstRow,
            },
            ...catalog.index.categories,
        ];
    }, [query, catalog, names, firstRow]);

    const columns = columnsFor(size.width);
    const { rows, height } = useMemo(
        () => layoutRows(sections, columns),
        [sections, columns],
    );
    const flat = useMemo(
        () =>
            rows.flatMap((row) =>
                row.kind === 'icons'
                    ? row.icons.map((icon) => ({
                          icon,
                          section: row.section.key,
                      }))
                    : [],
            ),
        [rows],
    );

    useLayoutEffect(() => {
        const element = scroller.current;

        if (!element) {
            return;
        }

        const measure = () =>
            setSize({
                width: element.clientWidth,
                height: element.clientHeight,
            });
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(element);

        return () => observer.disconnect();
    }, []);

    const optionId = (index: number) =>
        index >= 0 && flat[index]
            ? `${ids}-${flat[index].section}-${flat[index].icon}`
            : undefined;

    const reveal = (index: number) => {
        const element = scroller.current;
        const row = rows.find(
            (r) =>
                r.kind === 'icons' &&
                index >= r.first &&
                index < r.first + r.icons.length,
        );

        if (!element || !row) {
            return;
        }

        if (row.top < element.scrollTop + HEADING_HEIGHT) {
            element.scrollTop = Math.max(0, row.top - HEADING_HEIGHT);
        } else if (
            row.top + ROW_HEIGHT >
            element.scrollTop + element.clientHeight
        ) {
            element.scrollTop = row.top + ROW_HEIGHT - element.clientHeight;
        }
    };

    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (
            ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(
                event.key,
            )
        ) {
            // Left and right stay with the text until an icon is active.
            if (
                (event.key === 'ArrowLeft' || event.key === 'ArrowRight') &&
                active < 0
            ) {
                return;
            }

            event.preventDefault();
            const next = moveActive(rows, active, event.key);
            setActive(next);
            reveal(next);
        } else if (event.key === 'Enter') {
            event.preventDefault();
            const chosen =
                flat[active] ?? (query.trim() !== '' ? flat[0] : undefined);

            if (chosen) {
                onChoose(chosen.icon);
            }
        }
    };

    const jumpTo = (key: string) => {
        const heading = rows.find(
            (row) => row.kind === 'heading' && row.section.key === key,
        );

        if (heading && scroller.current) {
            scroller.current.scrollTop = heading.top;
        }
    };

    const current = sectionAt(rows, scrollTop);
    const shown = visibleRows(rows, scrollTop, size.height);
    const named = flat[active]?.icon ?? value;
    const searching = query.trim() !== '';

    return (
        <>
            <div className="corner-icon-search">
                <Search aria-hidden="true" size={16} strokeWidth={1.5} />
                <Input
                    ref={searchRef}
                    type="search"
                    role="combobox"
                    aria-label="Search icons"
                    aria-expanded="true"
                    aria-controls={`${ids}-grid`}
                    aria-autocomplete="list"
                    aria-activedescendant={optionId(active)}
                    placeholder="Search icons: food, home, travel…"
                    autoComplete="off"
                    value={query}
                    onChange={(e) => {
                        // A new search starts at its best match, at the top.
                        setQuery(e.target.value);
                        setActive(e.target.value.trim() === '' ? -1 : 0);
                        scroller.current?.scrollTo({ top: 0 });
                    }}
                    onKeyDown={onKeyDown}
                />
            </div>

            {!searching && (
                <label className="corner-icon-jump">
                    <span className="sr-only">Jump to a category</span>
                    <select
                        value={current?.key ?? ''}
                        onChange={(e) => jumpTo(e.target.value)}
                        className="corner-icon-jump-select shell-field"
                    >
                        {sections
                            .filter((section) => section.icons.length > 0)
                            .map((section) => (
                                <option key={section.key} value={section.key}>
                                    {section.title}
                                </option>
                            ))}
                    </select>
                </label>
            )}

            <div
                ref={scroller}
                className="corner-icon-scroll"
                onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
            >
                {rows.length === 0 ? (
                    <div className="corner-icon-empty" role="status">
                        <p>No icon matches “{query.trim()}”.</p>
                        <p className="corner-form-hint">
                            Try a simpler word, like food, home or travel.
                        </p>
                        <button
                            type="button"
                            className="corner-text-button"
                            onClick={() => {
                                setQuery('');
                                searchRef.current?.focus();
                            }}
                        >
                            Clear search
                        </button>
                    </div>
                ) : (
                    <>
                        {current && (
                            <div
                                className="corner-icon-sticky"
                                aria-hidden="true"
                            >
                                {current.title}
                            </div>
                        )}
                        <div
                            id={`${ids}-grid`}
                            role="listbox"
                            aria-label={searching ? 'Matching icons' : 'Icons'}
                            className="corner-icon-canvas"
                            style={{ height }}
                        >
                            {shown.map((row) => (
                                <GridRow
                                    key={`${row.section.key}-${row.top}`}
                                    row={row}
                                    value={chosen}
                                    active={active}
                                    optionId={optionId}
                                    onHover={setActive}
                                    onChoose={onChoose}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>

            <p className="corner-icon-footer" aria-hidden="true">
                {iconLabel(named)}
            </p>
        </>
    );
}

function GridRow({
    row,
    value,
    active,
    optionId,
    onHover,
    onChoose,
}: {
    row: Row;
    value: string;
    active: number;
    optionId: (index: number) => string | undefined;
    onHover: (index: number) => void;
    onChoose: (icon: string) => void;
}) {
    if (row.kind === 'heading') {
        return (
            <div
                role="presentation"
                className="corner-icon-heading"
                style={{ top: row.top, height: HEADING_HEIGHT }}
            >
                {row.section.title}
            </div>
        );
    }

    return (
        <div
            role="presentation"
            className="corner-icon-row"
            style={{ top: row.top, height: ROW_HEIGHT }}
        >
            {row.icons.map((icon, i) => {
                const index = row.first + i;

                return (
                    <div
                        key={icon}
                        id={optionId(index)}
                        role="option"
                        aria-selected={icon === value}
                        aria-label={iconLabel(icon)}
                        title={iconLabel(icon)}
                        data-active={index === active || undefined}
                        // Pointer only: the keyboard stays in the search field.
                        onPointerEnter={() => onHover(index)}
                        onPointerDown={(event) => event.preventDefault()}
                        onClick={() => onChoose(icon)}
                        className="corner-icon-option"
                        style={{ width: CELL, height: CELL }}
                    >
                        <ListIcon name={icon} size={20} strokeWidth={1.5} />
                    </div>
                );
            })}
        </div>
    );
}
