import { useHttp, usePage } from '@inertiajs/react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { MapPin, PenLine, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
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

type Suggestion = {
    id: string;
    mainText: string;
    secondaryText: string;
    /* Null when the place can't be resolved; the field stays open to pick again. */
    pick: () => Promise<StructuredLocation | null>;
};

type Search = (input: string) => Promise<Suggestion[]>;

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
    /* Null until the provider is ready. */
    search: Search | null;
};

function AutocompleteInput({
    label,
    onSelect,
    search,
}: AutocompleteInputProps) {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    // The query the suggestions answer. Offering the typed text before then would put cmdk's
    // selection on it, and Enter would take it instead of the top match about to arrive.
    const [answered, setAnswered] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const latestQuery = useRef('');

    const fetchSuggestions = useDebounceCallback(
        useEventCallback(async (input: string) => {
            if (!search) {
                return;
            }

            try {
                const found = await search(input);

                // A slower answer to an older query mustn't replace a newer one.
                if (input === latestQuery.current) {
                    setSuggestions(found);
                    setAnswered(input);
                }
                // eslint-disable-next-line local/no-silent-error -- search quota/network errors are expected; empty suggestions is the contract (typing your own place still works), and reporting would flood the error tracker on quota days.
            } catch {
                setSuggestions([]);
                setAnswered(input);
            }
        }),
        250,
    );

    useEffect(() => {
        latestQuery.current = query;

        if (!search || query.trim().length < 2) {
            return;
        }

        void fetchSuggestions(query);

        return fetchSuggestions.cancel;
    }, [search, query, fetchSuggestions]);

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

    async function pick(s: Suggestion) {
        try {
            const loc = await s.pick();

            if (loc) {
                choose(loc);
            }
            // eslint-disable-next-line local/no-silent-error -- place detail failures are quota-bound; the contract is "user picks again" (no chip rendered).
        } catch {
            // Intentionally empty — see directive above.
        }
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
                        key={s.id}
                        value={s.id}
                        onSelect={() => pick(s)}
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
                            <div className="shell-places-main">
                                {s.mainText}
                            </div>
                            {s.secondaryText && (
                                <div className="shell-places-secondary">
                                    {s.secondaryText}
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

type PlacesLibrary = {
    AutocompleteSessionToken?: new () => unknown;
    AutocompleteSuggestion?: {
        fetchAutocompleteSuggestions: (req: {
            input: string;
            sessionToken?: unknown;
        }) => Promise<{
            suggestions: Array<{
                placePrediction?: {
                    placeId?: string;
                    mainText?: { text?: string };
                    secondaryText?: { text?: string };
                    text?: { text?: string };
                    toPlace: () => {
                        id: string | null;
                        displayName?: string | null;
                        formattedAddress?: string | null;
                        location?: {
                            lat: () => number;
                            lng: () => number;
                        } | null;
                        fetchFields: (opts: {
                            fields: string[];
                        }) => Promise<unknown>;
                    };
                };
            }>;
        }>;
    };
};

function GooglePlacesInput({
    label,
    onSelect,
}: Omit<AutocompleteInputProps, 'search'>) {
    const places = useMapsLibrary('places') as unknown as PlacesLibrary | null;
    const sessionTokenRef = useRef<unknown>(null);

    const rotateSessionToken = useCallback(() => {
        const ctor = places?.AutocompleteSessionToken;

        if (ctor) {
            sessionTokenRef.current = new ctor();
        }
    }, [places]);

    useEffect(() => {
        rotateSessionToken();
    }, [rotateSessionToken]);

    const search = useCallback<Search>(
        async (input) => {
            const fetcher = places?.AutocompleteSuggestion;

            if (!fetcher) {
                return [];
            }

            const { suggestions } = await fetcher.fetchAutocompleteSuggestions({
                input,
                sessionToken: sessionTokenRef.current ?? undefined,
            });

            return suggestions.flatMap(({ placePrediction: p }) =>
                p?.placeId
                    ? [
                          {
                              id: p.placeId,
                              mainText:
                                  p.mainText?.text ??
                                  p.text?.text ??
                                  '(unnamed)',
                              secondaryText: p.secondaryText?.text ?? '',
                              pick: async () => {
                                  const place = p.toPlace();
                                  await place.fetchFields({
                                      fields: [
                                          'id',
                                          'displayName',
                                          'formattedAddress',
                                          'location',
                                      ],
                                  });

                                  const lat = place.location?.lat() ?? null;
                                  const lng = place.location?.lng() ?? null;

                                  if (
                                      !place.id ||
                                      lat === null ||
                                      lng === null
                                  ) {
                                      return null;
                                  }

                                  rotateSessionToken();

                                  return {
                                      place_id: place.id,
                                      name: place.displayName ?? '',
                                      address: place.formattedAddress ?? '',
                                      lat,
                                      lng,
                                  };
                              },
                          },
                      ]
                    : [],
            );
        },
        [places, rotateSessionToken],
    );

    return (
        <AutocompleteInput
            label={label}
            onSelect={onSelect}
            search={places ? search : null}
        />
    );
}

type FoundPlace = StructuredLocation & { place_id: string; address: string };

function OpenStreetMapInput({
    label,
    onSelect,
}: Omit<AutocompleteInputProps, 'search'>) {
    const { get } = useHttp<
        Record<string, never>,
        { results: FoundPlace[] } | undefined
    >();

    const search = useCallback<Search>(
        async (input) => {
            const body = await get(
                `${placesRoutes.search.url()}?q=${encodeURIComponent(input)}`,
            );

            return (body?.results ?? []).map((place) => ({
                id: place.place_id,
                mainText: place.name,
                secondaryText: place.address,
                pick: async () => place,
            }));
        },
        [get],
    );

    return (
        <AutocompleteInput label={label} onSelect={onSelect} search={search} />
    );
}

function useGoogleMapsKey(): string | null {
    return usePage<{ googleMapsApiKey: string | null }>().props
        .googleMapsApiKey;
}

export default function PlacesLocationField({
    label = 'Search for a place',
    onSelect,
    value,
}: PlacesLocationFieldProps) {
    const apiKey = useGoogleMapsKey();

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

    if (!apiKey) {
        return <OpenStreetMapInput label={label} onSelect={onSelect} />;
    }

    return (
        <APIProvider apiKey={apiKey}>
            <GooglePlacesInput label={label} onSelect={onSelect} />
        </APIProvider>
    );
}
