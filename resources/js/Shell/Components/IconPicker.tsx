import * as Sentry from '@sentry/react';
import { useVirtualizer } from '@tanstack/react-virtual';
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

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    NativeSelect,
    NativeSelectOption,
} from '@/components/ui/native-select';
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
import { count } from '@/lib/plural';
import { cn } from '@/lib/utils';
import ErrorState from '@/Shell/Components/ErrorState';
import LoadingState from '@/Shell/Components/LoadingState';
import type { Row, Section } from '@/Shell/lib/icon-picker';
import {
    CELL,
    HEADING_HEIGHT,
    ROW_HEIGHT,
    columnsFor,
    layoutRows,
    moveActive,
    recentIcons,
    rememberIcon,
    searchIcons,
    sectionAt,
} from '@/Shell/lib/icon-picker';
import LinkableIcon from '@/Shell/linkables/LinkableIcon';
import type { IconIndex, IconPaths } from '@/Shell/linkables/lucide';
import {
    iconLabel,
    loadIconIndex,
    loadIconPaths,
} from '@/Shell/linkables/lucide';

type Props = {
    value: string;
    onChange: (icon: string) => void;
    /* Shown first, after the current and recent icons, before anything is searched. */
    suggested: string[];
    /* Where this caller's recent icons are kept, so each kind of thing remembers its own. */
    recentKey: string;
    /* For FormField: its label points at the trigger, and an error describes it. */
    id?: string;
    'aria-describedby'?: string;
    'aria-invalid'?: boolean;
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
export default function IconPicker({
    value,
    onChange,
    suggested,
    recentKey,
    id,
    'aria-describedby': describedBy,
    'aria-invalid': invalid,
}: Props) {
    const [open, setOpen] = useState(false);
    const isPhone = useIsPhone();
    const trigger = useRef<HTMLButtonElement>(null);

    useOverlayHistory(open, () => setOpen(false));

    const choose = (icon: string) => {
        rememberIcon(recentKey, icon);
        onChange(icon);
        setOpen(false);
    };

    const button = (
        <button
            ref={trigger}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={open}
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            onPointerEnter={preload}
            onFocus={preload}
            onClick={() => setOpen(true)}
            className="icon-picker-trigger shell-press"
        >
            <span className="icon-picker-trigger-mark">
                <LinkableIcon name={value} size={22} strokeWidth={1.5} />
            </span>
            <span className="icon-picker-trigger-name">{iconLabel(value)}</span>
            <span className="icon-picker-trigger-action">
                Change
                <ChevronDown aria-hidden="true" size={16} strokeWidth={1.5} />
            </span>
        </button>
    );

    const panel = (
        <IconPanel
            value={value}
            onChoose={choose}
            roomy={isPhone}
            first={() => [value, ...recentIcons(recentKey), ...suggested]}
        />
    );

    if (isPhone) {
        return (
            <>
                {button}
                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetContent
                        side="bottom"
                        className="icon-picker-sheet gap-0 p-0"
                        finalFocus={trigger}
                    >
                        <SheetTitle className="icon-picker-sheet-title">
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
            <PopoverTrigger render={button} />
            <PopoverContent
                align="start"
                className="icon-picker-popover w-[372px] p-0"
                aria-label="Choose an icon"
                // The panel focuses its own search field.
                initialFocus={false}
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
    first,
}: {
    value: string;
    onChoose: (icon: string) => void;
    roomy: boolean;
    first: () => string[];
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
                        component: 'Shell/IconPicker',
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
                first={first}
            />
        );
    } else if (failed) {
        body = (
            <div className="icon-picker-state">
                <ErrorState
                    variant="inline"
                    message="Couldn't load the icons."
                    onRetry={retry}
                />
            </div>
        );
    } else {
        body = (
            <div className="icon-picker-state" aria-busy="true">
                <LoadingState rows={4} variant="list" />
            </div>
        );
    }

    return (
        <div
            className={cn(
                'icon-picker-panel',
                roomy && 'icon-picker-panel--roomy',
            )}
        >
            {!catalog && (
                <div className="icon-picker-search">
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
    first,
}: {
    catalog: Catalog;
    value: string;
    onChoose: (icon: string) => void;
    searchRef: React.RefObject<HTMLInputElement | null>;
    first: () => string[];
}) {
    // The virtualizer hands back the same object with new rows on every scroll; the compiler's
    // memoising would keep drawing the first ones.
    'use no memo';

    const ids = useId();
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(-1);
    const [width, setWidth] = useState(344);
    const scroller = useRef<HTMLDivElement>(null);

    // The grid shows each icon once, by its own name; a list may hold an older alias of it.
    const canonical = useCallback(
        (name: string) => catalog.paths.aliases[name] ?? name,
        [catalog],
    );
    const chosen = canonical(value);

    // Read when the panel opens: choosing an icon closes it, so this row never goes stale.
    const [firstRow] = useState(() =>
        [...new Set(first().map(canonical))].filter(
            (name) => name in catalog.paths.paths,
        ),
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
                    title: count(found.length, 'icon'),
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

    const columns = columnsFor(width);
    const { rows } = useMemo(
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

    // Rows of a heading or a full line of icons: their heights are known, so nothing is measured.
    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => scroller.current,
        estimateSize: (index) =>
            rows[index].kind === 'heading' ? HEADING_HEIGHT : ROW_HEIGHT,
        getItemKey: (index) => `${rows[index].section.key}-${rows[index].top}`,
        overscan: 4,
        // The sticky heading covers the top of the grid: a row brought into view clears it.
        scrollPaddingStart: HEADING_HEIGHT,
        initialRect: { width: 344, height: 300 },
    });

    // The columns follow the panel's width; the virtualizer follows its height itself.
    useLayoutEffect(() => {
        const element = scroller.current;

        if (!element) {
            return;
        }

        const measure = () => setWidth(element.clientWidth || 344);
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
        const at = rows.findIndex(
            (r) =>
                r.kind === 'icons' &&
                index >= r.first &&
                index < r.first + r.icons.length,
        );

        if (at >= 0) {
            virtualizer.scrollToIndex(at, { align: 'auto' });
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

        if (heading) {
            // Its own heading takes the sticky one's place exactly.
            virtualizer.scrollToOffset(heading.top);
        }
    };

    const current = sectionAt(rows, virtualizer.scrollOffset ?? 0);
    const shown = virtualizer.getVirtualItems();
    const named = flat[active]?.icon ?? value;
    const searching = query.trim() !== '';

    return (
        <>
            <div className="icon-picker-search">
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
                        virtualizer.scrollToOffset(0);
                    }}
                    onKeyDown={onKeyDown}
                />
            </div>

            {!searching && (
                <label className="icon-picker-jump">
                    <span className="sr-only">Jump to a category</span>
                    <NativeSelect
                        value={current?.key ?? ''}
                        onChange={(e) => jumpTo(e.target.value)}
                        wrapperClassName="w-full"
                        className="icon-picker-jump-select"
                    >
                        {sections
                            .filter((section) => section.icons.length > 0)
                            .map((section) => (
                                <NativeSelectOption
                                    key={section.key}
                                    value={section.key}
                                >
                                    {section.title}
                                </NativeSelectOption>
                            ))}
                    </NativeSelect>
                </label>
            )}

            <div ref={scroller} className="icon-picker-scroll">
                {rows.length === 0 ? (
                    <div className="icon-picker-empty" role="status">
                        <p>No icon matches “{query.trim()}”.</p>
                        <p className="icon-picker-hint">
                            Try a simpler word, like food, home or travel.
                        </p>
                        <Button
                            type="button"
                            variant="link"
                            className="icon-picker-text-button"
                            onClick={() => {
                                setQuery('');
                                searchRef.current?.focus();
                            }}
                        >
                            Clear search
                        </Button>
                    </div>
                ) : (
                    <>
                        {current && (
                            <div
                                className="icon-picker-sticky"
                                aria-hidden="true"
                            >
                                {current.title}
                            </div>
                        )}
                        <div
                            id={`${ids}-grid`}
                            role="listbox"
                            aria-label={searching ? 'Matching icons' : 'Icons'}
                            className="icon-picker-canvas"
                            style={{ height: virtualizer.getTotalSize() }}
                        >
                            {shown.map((virtual) => (
                                <GridRow
                                    key={virtual.key}
                                    row={rows[virtual.index]}
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

            <p className="icon-picker-footer" aria-hidden="true">
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
                className="icon-picker-heading"
                style={{ top: row.top, height: HEADING_HEIGHT }}
            >
                {row.section.title}
            </div>
        );
    }

    return (
        <div
            role="presentation"
            className="icon-picker-row"
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
                        className="icon-picker-option"
                        style={{ width: CELL, height: CELL }}
                    >
                        <LinkableIcon name={icon} size={20} strokeWidth={1.5} />
                    </div>
                );
            })}
        </div>
    );
}
