import { useHttp } from '@inertiajs/react';
import { MapPin, PenLine, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import {
    useDebounceCallback,
    useEventCallback,
    useOnClickOutside,
} from 'usehooks-ts';
import {
    Command,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import * as placesRoutes from '@/routes/places';

type StructuredLocation = {
    place_id: string | null;
    name: string;
    address: string | null;
    lat: number | null;
    lng: number | null;
};

export type SelectedLocationView = {
    name: string | null;
    address: string | null;
};

type PlacesLocationFieldProps = {
    /* The field's name, said by screen readers: cmdk owns the input's id, so no <label for>. */
    label?: string;
    onSelect: (loc: StructuredLocation | null) => void;
    value: SelectedLocationView | null;
};

type FoundPlace = StructuredLocation & { place_id: string; address: string };

function displayLabel(view: SelectedLocationView): string {
    const { name, address } = view;

    if (name && address && !address.includes(name)) {
        return name;
    }

    if (name && !address) {
        return name;
    }

    if (address) {
        return address;
    }

    return name ?? '';
}

type AutocompleteInputProps = {
    label: string;
    onSelect: (loc: StructuredLocation) => void;
};

function AutocompleteInput({ label, onSelect }: AutocompleteInputProps) {
    const { get } = useHttp<
        Record<string, never>,
        { results: FoundPlace[] } | undefined
    >();
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<FoundPlace[]>([]);
    // The query the suggestions answer. Offering the typed text before then would put cmdk's
    // selection on it, and Enter would take it instead of the top match about to arrive.
    const [answered, setAnswered] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const latestQuery = useRef('');

    const fetchSuggestions = useDebounceCallback(
        useEventCallback(async (input: string) => {
            try {
                const body = await get(
                    `${placesRoutes.search.url()}?q=${encodeURIComponent(input)}`,
                );
                const found = body?.results ?? [];

                // A slower answer to an older query mustn't replace a newer one.
                if (input === latestQuery.current) {
                    setSuggestions(found);
                    setAnswered(input);
                }
                // eslint-disable-next-line local/no-silent-error -- network errors and throttling are expected; empty suggestions is the contract (typing your own place still works), and reporting would flood the error tracker on quota days.
            } catch {
                setSuggestions([]);
                setAnswered(input);
            }
        }),
        250,
    );

    useEffect(() => {
        latestQuery.current = query;

        if (query.trim().length < 2) {
            return;
        }

        void fetchSuggestions(query);

        return fetchSuggestions.cancel;
    }, [query, fetchSuggestions]);

    const typed = query.trim();
    const visibleSuggestions = typed.length < 2 ? [] : suggestions;
    const offerTyped = typed.length >= 2 && answered === query;
    const listOpen = open && (visibleSuggestions.length > 0 || offerTyped);

    // usehooks-ts 3 types predate React 19's nullable RefObject.
    useOnClickOutside(wrapperRef as RefObject<HTMLElement>, () =>
        setOpen(false),
    );

    function choose(loc: StructuredLocation) {
        onSelect(loc);
        setQuery('');
        setSuggestions([]);
        setAnswered(null);
        setOpen(false);
    }

    // cmdk moves through the suggestions with the arrow keys and picks with Enter; the search
    // has already matched them, so it doesn't filter.
    return (
        <Command
            ref={wrapperRef}
            data-test="location-field"
            shouldFilter={false}
            loop
            label={label}
            onKeyDown={(e) => {
                if (listOpen) {
                    // Escape closes the suggestions first, not the sheet around the form.
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        e.stopPropagation();
                        setOpen(false);
                    }

                    return;
                }

                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    setOpen(true);
                } else if (e.key === 'Enter') {
                    // Nothing on show to pick, and a search box doesn't save the form.
                    e.preventDefault();
                }
            }}
            className="shell-places-root overflow-visible rounded-none bg-transparent p-0 [&_[data-slot=command-input-wrapper]]:p-0"
        >
            {/* cmdk sets the input's id and names it with `label`. */}
            <CommandInput
                value={query}
                onValueChange={(next) => {
                    setQuery(next);
                    setOpen(true);
                }}
                onFocus={() => {
                    if (visibleSuggestions.length > 0 || offerTyped) {
                        setOpen(true);
                    }
                }}
                placeholder="Search for a place"
            />

            <CommandList
                hidden={!listOpen}
                aria-label="Places"
                className="shell-places-suggestions"
            >
                {visibleSuggestions.map((s) => (
                    <CommandItem
                        key={s.place_id}
                        value={s.place_id}
                        onSelect={() => choose(s)}
                        className="items-start"
                    >
                        <MapPin
                            aria-hidden="true"
                            size={14}
                            strokeWidth={1.5}
                            color="var(--shell-text-muted)"
                            className="mt-1 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                            <div className="shell-places-main">{s.name}</div>
                            {s.address && (
                                <div className="shell-places-secondary">
                                    {s.address}
                                </div>
                            )}
                        </div>
                    </CommandItem>
                ))}
                {/* Last, so Enter still takes the top match. "Grandma's house" is on no map. */}
                {offerTyped && (
                    <CommandItem
                        value="typed-place"
                        onSelect={() =>
                            choose({
                                place_id: null,
                                name: typed.slice(0, 200),
                                address: null,
                                lat: null,
                                lng: null,
                            })
                        }
                        className="items-start"
                    >
                        <PenLine
                            aria-hidden="true"
                            size={14}
                            strokeWidth={1.5}
                            color="var(--shell-text-muted)"
                            className="mt-1 shrink-0"
                        />
                        <div className="shell-places-main min-w-0 flex-1">
                            Use “{typed}”
                        </div>
                    </CommandItem>
                )}
            </CommandList>
        </Command>
    );
}

export default function PlacesLocationField({
    label = 'Search for a place',
    onSelect,
    value,
}: PlacesLocationFieldProps) {
    if (value && (value.name || value.address)) {
        const label = displayLabel(value);

        return (
            <div data-test="location-field" className="shell-places-field">
                <MapPin
                    aria-hidden="true"
                    size={14}
                    strokeWidth={1.5}
                    color="var(--shell-accent-text)"
                    className="shrink-0"
                />
                <span className="shell-places-value">{label}</span>
                <button
                    type="button"
                    aria-label="Clear location"
                    onClick={() => onSelect(null)}
                    className="shell-places-clear"
                >
                    <X aria-hidden="true" size={14} strokeWidth={1.5} />
                </button>
            </div>
        );
    }

    return <AutocompleteInput label={label} onSelect={onSelect} />;
}
