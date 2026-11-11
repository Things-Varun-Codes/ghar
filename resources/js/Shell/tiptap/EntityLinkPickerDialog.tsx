/* A Dialog, not a Popover: on iOS an anchored Popover collapses the TipTap selection. */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { useMediaQuery } from '@/hooks/use-media-query';
import { entityIcon } from '@/Shell/linkables/entityIcon';

// A literal on purpose: Corner owns this route, and the shell must build with Corner disabled.
const LINKABLE_SEARCH_URL = '/api/linkable/search';
const SEARCH_DEBOUNCE_MS = 250;

export type PickedEntity = {
    type: string;
    id: number;
    title: string;
    thumbnailUrl: string | null;
    deepLinkUrl: string | null;
};

type ApiResultRow = {
    type: string;
    id: number;
    title: string;
    thumbnail_url?: string | null;
    deep_link_url?: string | null;
};

type FilterKey =
    | 'all'
    | 'corner.song'
    | 'corner.movie'
    | 'corner.place'
    | 'corner.activity';

const FILTER_CHIPS: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'corner.song', label: 'Songs' },
    { key: 'corner.movie', label: 'Movies' },
    { key: 'corner.place', label: 'Places' },
    { key: 'corner.activity', label: 'Activities' },
];

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (entity: PickedEntity) => void;
};

export default function EntityLinkPickerDialog({
    open,
    onOpenChange,
    onSelect,
}: Props) {
    const isWide = useMediaQuery('(min-width: 720px)');

    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<FilterKey>('all');
    const [results, setResults] = useState<ApiResultRow[]>([]);
    const [highlightIdx, setHighlightIdx] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const inputRef = useRef<HTMLInputElement | null>(null);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (!open) {
            return undefined;
        }

        /* eslint-disable react-hooks/set-state-in-effect -- One-shot reset on the open→true transition; props -> internal session state sync, not cascading renders. */
        setQuery('');
        setFilter('all');
        setResults([]);
        setHighlightIdx(0);
        setError(null);
        /* eslint-enable react-hooks/set-state-in-effect */

        const t = setTimeout(() => inputRef.current?.focus(), 50);

        return () => clearTimeout(t);
    }, [open]);

    const runSearch = useCallback(async (q: string, types: FilterKey) => {
        if (q.trim().length < 2) {
            setResults([]);
            setLoading(false);
            setError(null);

            return;
        }

        setLoading(true);
        setError(null);

        abortRef.current?.abort();
        const ctrl = new AbortController();
        abortRef.current = ctrl;

        const params = new URLSearchParams();
        params.set('q', q.trim());

        if (types !== 'all') {
            params.append('types[]', types);
        }

        try {
            const res = await fetch(
                `${LINKABLE_SEARCH_URL}?${params.toString()}`,
                {
                    signal: ctrl.signal,
                    credentials: 'same-origin',
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                },
            );

            if (!res.ok) {
                if (res.status === 422) {
                    setResults([]);
                    setLoading(false);

                    return;
                }

                throw new Error(`HTTP ${res.status}`);
            }

            const body = (await res.json()) as { results?: ApiResultRow[] };
            setResults(body.results ?? []);
            setHighlightIdx(0);
            setLoading(false);
            // eslint-disable-next-line local/no-silent-error -- AbortError is a normal cancellation signal (we abort in-flight requests on each new keystroke + dialog close). All other errors surface via the setError banner.
        } catch (err: unknown) {
            if ((err as { name?: string } | null)?.name === 'AbortError') {
                return;
            }

            setError("Couldn't load that. Check your connection.");
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!open) {
            return;
        }

        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        debounceTimer.current = setTimeout(() => {
            runSearch(query, filter);
        }, SEARCH_DEBOUNCE_MS);

        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, [query, filter, open, runSearch]);

    useEffect(() => {
        if (!open) {
            abortRef.current?.abort();
        }
    }, [open]);

    const pick = (row: ApiResultRow) => {
        onSelect({
            type: row.type,
            id: row.id,
            title: row.title,
            thumbnailUrl: row.thumbnail_url ?? null,
            deepLinkUrl: row.deep_link_url ?? null,
        });
        onOpenChange(false);
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightIdx((i) => Math.min(i + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightIdx((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            const row = results[highlightIdx];

            if (row) {
                e.preventDefault();
                pick(row);
            }
        } else if (/^[1-9]$/.test(e.key)) {
            const idx = parseInt(e.key, 10) - 1;
            const row = results[idx];

            if (row) {
                e.preventDefault();
                pick(row);
            }
        }
    };

    const matchesLabel = `${results.length} ${results.length === 1 ? 'match' : 'matches'}`;

    const pickerBody = (
        <div className="flex flex-col gap-3">
            <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search songs, movies, places, activities…"
                aria-label="Search Corner"
                autoComplete="off"
                className="shell-picker-input"
            />

            <div
                role="tablist"
                aria-label="Filter by type"
                className="flex flex-wrap gap-1.5"
            >
                {FILTER_CHIPS.map((chip) => (
                    <button
                        key={chip.key}
                        type="button"
                        role="tab"
                        aria-selected={filter === chip.key}
                        onClick={() => setFilter(chip.key)}
                        className="shell-picker-tab"
                        style={{
                            background:
                                filter === chip.key
                                    ? 'var(--shell-text)'
                                    : 'transparent',
                            color:
                                filter === chip.key
                                    ? 'var(--shell-bg)'
                                    : 'var(--shell-text)',
                        }}
                    >
                        {chip.key !== 'all' &&
                            React.createElement(entityIcon(chip.key), {
                                size: 14,
                                'aria-hidden': true,
                            })}
                        {chip.label}
                    </button>
                ))}
            </div>

            <div
                role="listbox"
                aria-label="Corner search results"
                aria-busy={loading}
                className="shell-picker-results"
            >
                <span className="sr-only" role="status">
                    Use up and down arrows to navigate; press Enter to select.
                </span>
                {error && (
                    <p role="alert" className="shell-picker-error">
                        {error}
                    </p>
                )}

                {!error && results.length === 0 && !loading && (
                    <p className="shell-picker-note">
                        {query.trim().length < 2
                            ? 'Search songs, movies, places, activities…'
                            : 'No matches. Try a different search.'}
                    </p>
                )}

                {!error &&
                    results.map((row, idx) => {
                        const isActive = idx === highlightIdx;

                        return (
                            <button
                                key={`${row.type}-${row.id}`}
                                role="option"
                                aria-selected={isActive}
                                type="button"
                                onMouseEnter={() => setHighlightIdx(idx)}
                                onClick={() => pick(row)}
                                className="shell-picker-row"
                                style={{
                                    background: isActive
                                        ? 'color-mix(in oklch, var(--shell-accent) 12%, transparent)'
                                        : 'transparent',
                                }}
                            >
                                {row.thumbnail_url ? (
                                    <img
                                        src={row.thumbnail_url}
                                        alt=""
                                        className="shell-picker-thumb"
                                    />
                                ) : (
                                    <span
                                        aria-hidden="true"
                                        className="shell-picker-icon"
                                    >
                                        {React.createElement(
                                            entityIcon(row.type),
                                            {
                                                size: 18,
                                                'aria-hidden': true,
                                            },
                                        )}
                                    </span>
                                )}
                                <span className="flex min-w-0 flex-col">
                                    <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                                        {row.title}
                                    </span>
                                    <span className="text-[13px] text-(--shell-text-muted)">
                                        <span
                                            aria-hidden="true"
                                            className="mr-[3px] inline-flex align-middle"
                                        >
                                            {React.createElement(
                                                entityIcon(row.type),
                                                {
                                                    size: 13,
                                                    'aria-hidden': true,
                                                },
                                            )}
                                        </span>
                                        {row.type
                                            .replace('corner.', '')
                                            .replace('history.', '')}
                                    </span>
                                </span>
                            </button>
                        );
                    })}
            </div>

            <div className="shell-picker-footer">
                <span>↑↓ navigate · ↵ select · esc close</span>
                <span>{matchesLabel}</span>
            </div>
        </div>
    );

    if (!isWide) {
        return (
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent
                    side="bottom"
                    data-app="our-corner"
                    className="max-h-[85dvh] overflow-auto"
                >
                    <SheetHeader>
                        <SheetTitle>Link a Corner thing</SheetTitle>
                        <SheetDescription>
                            Search songs, movies, places, activities…
                        </SheetDescription>
                    </SheetHeader>
                    {pickerBody}
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent data-app="our-corner" className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Link a Corner thing</DialogTitle>
                    <DialogDescription>
                        Search songs, movies, places, activities…
                    </DialogDescription>
                </DialogHeader>
                {pickerBody}
            </DialogContent>
        </Dialog>
    );
}
