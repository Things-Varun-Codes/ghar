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
import { useAppAttrs } from '@/hooks/use-app-attrs';
import { useIsPhone } from '@/hooks/use-breakpoint';
import { useOverlayHistory } from '@/hooks/use-overlay-history';
import { count } from '@/lib/plural';
import { search as linkableSearch } from '@/routes/linkable';
import LinkableIcon from '@/Shell/linkables/LinkableIcon';

const SEARCH_DEBOUNCE_MS = 250;
const TITLE = 'Link to something';
const DESCRIPTION = 'Search everything this home keeps.';

export type PickedEntity = {
    type: string;
    id: number;
    title: string;
    thumbnailUrl: string | null;
    deepLinkUrl: string | null;
    icon: string | null;
};

type ApiResultRow = {
    type: string;
    id: number;
    title: string;
    thumbnail_url?: string | null;
    deep_link_url?: string | null;
    /* What to file it under in the results: its list, say, or its kind of thing. */
    group: string;
    /* A lucide icon name, drawn when there is no picture. */
    icon?: string | null;
};

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
    const isPhone = useIsPhone();
    const appAttrs = useAppAttrs();
    useOverlayHistory(open, () => onOpenChange(false));

    const [query, setQuery] = useState('');
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
        setResults([]);
        setHighlightIdx(0);
        setError(null);
        /* eslint-enable react-hooks/set-state-in-effect */

        const t = setTimeout(() => inputRef.current?.focus(), 50);

        return () => clearTimeout(t);
    }, [open]);

    const runSearch = useCallback(async (q: string) => {
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

        try {
            const res = await fetch(
                `${linkableSearch.url()}?${params.toString()}`,
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

            setError("Couldn't search. Check your connection and try again.");
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
            runSearch(query);
        }, SEARCH_DEBOUNCE_MS);

        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, [query, open, runSearch]);

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
            icon: row.icon ?? null,
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

    const matchesLabel = count(results.length, 'match', 'matches');

    const pickerBody = (
        <div className="flex flex-col gap-3">
            <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search"
                aria-label="Search for something to link"
                autoComplete="off"
                className="shell-picker-input"
            />

            <div
                role="listbox"
                aria-label="Search results"
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
                            ? 'Type at least 2 characters to search.'
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
                                        onError={(e) => {
                                            e.currentTarget.style.display =
                                                'none';
                                        }}
                                        className="shell-picker-thumb"
                                    />
                                ) : (
                                    <span
                                        aria-hidden="true"
                                        className="shell-picker-icon"
                                    >
                                        <LinkableIcon
                                            name={row.icon}
                                            size={18}
                                        />
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
                                            <LinkableIcon
                                                name={row.icon}
                                                size={13}
                                            />
                                        </span>
                                        {row.group}
                                    </span>
                                </span>
                            </button>
                        );
                    })}
            </div>

            <div className="shell-picker-footer">
                <span aria-hidden="true">
                    ↑↓ to move, Enter to choose, Esc to close
                </span>
                <span>{matchesLabel}</span>
            </div>
        </div>
    );

    if (isPhone) {
        return (
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent
                    side="bottom"
                    {...appAttrs}
                    className="max-h-[85dvh] overflow-auto"
                >
                    <SheetHeader>
                        <SheetTitle>{TITLE}</SheetTitle>
                        <SheetDescription>{DESCRIPTION}</SheetDescription>
                    </SheetHeader>
                    {pickerBody}
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent {...appAttrs} className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>{TITLE}</DialogTitle>
                    <DialogDescription>{DESCRIPTION}</DialogDescription>
                </DialogHeader>
                {pickerBody}
            </DialogContent>
        </Dialog>
    );
}
