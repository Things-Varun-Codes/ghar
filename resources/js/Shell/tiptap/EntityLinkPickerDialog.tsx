/* A Dialog, not a Popover: on iOS an anchored Popover collapses the TipTap selection. */

import { HttpCancelledError } from '@inertiajs/core';
import { useHttp } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDebounceCallback } from 'usehooks-ts';

import {
    Command,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
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
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const inputRef = useRef<HTMLInputElement | null>(null);
    const { get, cancel } = useHttp<
        Record<string, never>,
        { results?: ApiResultRow[] } | undefined
    >();

    useEffect(() => {
        if (!open) {
            return undefined;
        }

        /* eslint-disable react-hooks/set-state-in-effect -- One-shot reset on the open→true transition; props -> internal session state sync, not cascading renders. */
        setQuery('');
        setResults([]);
        setError(null);
        /* eslint-enable react-hooks/set-state-in-effect */

        const t = setTimeout(() => inputRef.current?.focus(), 50);

        return () => clearTimeout(t);
    }, [open]);

    const runSearch = useCallback(
        async (q: string) => {
            if (q.trim().length < 2) {
                setResults([]);
                setLoading(false);
                setError(null);

                return;
            }

            setLoading(true);
            setError(null);

            cancel();

            const params = new URLSearchParams();
            params.set('q', q.trim());

            try {
                // useHttp resolves a 422 (a query the server won't search) with nothing.
                const body = await get(
                    `${linkableSearch.url()}?${params.toString()}`,
                );
                setResults(body?.results ?? []);
                setLoading(false);
                // eslint-disable-next-line local/no-silent-error -- a cancel is normal (each keystroke and closing the dialog cancel the search in flight). All other errors surface via the setError banner.
            } catch (err: unknown) {
                if (err instanceof HttpCancelledError) {
                    return;
                }

                setError(
                    "Couldn't search. Check your connection and try again.",
                );
                setLoading(false);
            }
        },
        [get, cancel],
    );

    const debouncedSearch = useDebounceCallback(runSearch, SEARCH_DEBOUNCE_MS);

    useEffect(() => {
        if (!open) {
            return;
        }

        void debouncedSearch(query);

        return debouncedSearch.cancel;
    }, [query, open, debouncedSearch]);

    useEffect(() => {
        if (!open) {
            cancel();
        }
    }, [open, cancel]);

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

    const matchesLabel = count(results.length, 'match', 'matches');

    // In the order the server ranked them, filed under the first group each one names.
    const groups = useMemo(() => {
        const byGroup = new Map<string, ApiResultRow[]>();

        for (const row of results) {
            byGroup.set(row.group, [...(byGroup.get(row.group) ?? []), row]);
        }

        return Array.from(byGroup.entries());
    }, [results]);

    // cmdk moves through the results with the arrow keys and picks with Enter; the server has
    // already matched them, so it doesn't filter.
    const pickerBody = (
        <Command
            shouldFilter={false}
            loop
            label="Search for something to link"
            className="gap-3 overflow-visible rounded-none bg-transparent p-0 [&_[data-slot=command-input-wrapper]]:p-0"
        >
            {/* The group draws the focus state for an input it holds. */}
            <CommandInput
                ref={inputRef}
                value={query}
                onValueChange={setQuery}
                placeholder="Search"
            />

            <CommandList
                aria-label="Search results"
                aria-busy={loading}
                className="shell-picker-results max-h-[360px] p-1"
            >
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
                    groups.map(([group, rows]) => (
                        <CommandGroup key={group} heading={group}>
                            {rows.map((row) => (
                                <CommandItem
                                    key={`${row.type}-${row.id}`}
                                    value={`${row.type}:${row.id}`}
                                    onSelect={() => pick(row)}
                                    className="gap-3"
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
                                    <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                                        {row.title}
                                    </span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    ))}
            </CommandList>

            <div className="shell-picker-footer">
                <span aria-hidden="true">
                    ↑↓ to move, Enter to choose, Esc to close
                </span>
                <span role="status">{matchesLabel}</span>
            </div>
        </Command>
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
