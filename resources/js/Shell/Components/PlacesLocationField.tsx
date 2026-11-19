import { usePage } from '@inertiajs/react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { MapPin, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Command,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';

type StructuredLocation = {
    place_id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
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
    const places = useMapsLibrary('places');
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<
        Array<{
            placeId: string;
            mainText: string;
            secondaryText: string;
            placePrediction: {
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
        }>
    >([]);
    const [open, setOpen] = useState(false);
    const sessionTokenRef = useRef<unknown>(null);
    const wrapperRef = useRef<HTMLDivElement | null>(null);

    const rotateSessionToken = useCallback(() => {
        const ctor = (
            places as unknown as {
                AutocompleteSessionToken?: new () => unknown;
            } | null
        )?.AutocompleteSessionToken;

        if (ctor) {
            sessionTokenRef.current = new ctor();
        }
    }, [places]);

    useEffect(() => {
        rotateSessionToken();
    }, [rotateSessionToken]);

    useEffect(() => {
        if (!places || query.trim().length < 2) {
            return;
        }

        const handle = window.setTimeout(async () => {
            try {
                const fetcher = (
                    places as unknown as {
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
                                        toPlace: () => unknown;
                                    };
                                }>;
                            }>;
                        };
                    }
                ).AutocompleteSuggestion;

                if (!fetcher) {
                    return;
                }

                const { suggestions: raw } =
                    await fetcher.fetchAutocompleteSuggestions({
                        input: query,
                        sessionToken: sessionTokenRef.current ?? undefined,
                    });

                const normalised = raw
                    .map((s) => s.placePrediction)
                    .filter(
                        (
                            p,
                        ): p is NonNullable<
                            (typeof raw)[number]['placePrediction']
                        > => !!p && !!p.placeId,
                    )
                    .map((p) => ({
                        placeId: p.placeId as string,
                        mainText:
                            p.mainText?.text ?? p.text?.text ?? '(unnamed)',
                        secondaryText: p.secondaryText?.text ?? '',
                        placePrediction: p as never,
                    }));

                setSuggestions(normalised);
                setOpen(true);
                // eslint-disable-next-line local/no-silent-error -- Google Maps quota/network errors are expected; empty suggestions is the contract, and reporting would flood the error tracker on quota days.
            } catch {
                setSuggestions([]);
            }
        }, 250);

        return () => window.clearTimeout(handle);
    }, [places, query]);

    const visibleSuggestions = query.trim().length < 2 ? [] : suggestions;
    const listOpen = open && visibleSuggestions.length > 0;

    useEffect(() => {
        if (!open) {
            return;
        }

        const handler = (ev: MouseEvent) => {
            if (
                wrapperRef.current &&
                !wrapperRef.current.contains(ev.target as Node)
            ) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handler);

        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    async function pick(s: (typeof suggestions)[number]) {
        try {
            const place = s.placePrediction.toPlace();
            await place.fetchFields({
                fields: ['id', 'displayName', 'formattedAddress', 'location'],
            });

            const id = place.id;
            const displayName = place.displayName ?? '';
            const formattedAddress = place.formattedAddress ?? '';
            const lat = place.location?.lat() ?? null;
            const lng = place.location?.lng() ?? null;

            if (!id || lat === null || lng === null) {
                return;
            }

            onSelect({
                place_id: id,
                name: displayName,
                address: formattedAddress,
                lat,
                lng,
            });

            setQuery('');
            setSuggestions([]);
            setOpen(false);
            rotateSessionToken();
            // eslint-disable-next-line local/no-silent-error -- Place Details (fetchFields) failures are quota-bound; the contract is "user picks again" (no chip rendered).
        } catch {
            // Intentionally empty — see directive above.
        }
    }

    // cmdk moves through the suggestions with the arrow keys and picks with Enter; Google has
    // already matched them, so it doesn't filter.
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
                    if (visibleSuggestions.length > 0) {
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
                        key={s.placeId}
                        value={s.placeId}
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
            </CommandList>
        </Command>
    );
}

function useGoogleMapsKey(): string | null {
    return usePage<{ googleMapsApiKey: string | null }>().props
        .googleMapsApiKey;
}

/** Without a Google Maps key, callers render plain inputs instead of the search field. */
export function useHasPlacesSearch(): boolean {
    return Boolean(useGoogleMapsKey());
}

type ManualLocationInputProps = {
    id: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    maxLength: number;
};

export function ManualLocationInput({
    id,
    value,
    onChange,
    placeholder,
    maxLength,
}: ManualLocationInputProps) {
    return (
        <div
            data-test="location-field"
            className="shell-field-focus shell-places-field"
        >
            <MapPin
                aria-hidden="true"
                size={14}
                strokeWidth={1.5}
                color="var(--shell-text-muted)"
                className="shrink-0"
            />
            <input
                id={id}
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                maxLength={maxLength}
                autoComplete="off"
                className="shell-places-input"
            />
        </div>
    );
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
        return null;
    }

    return (
        <APIProvider apiKey={apiKey}>
            <AutocompleteInput
                label={label}
                onSelect={(loc) => onSelect(loc)}
            />
        </APIProvider>
    );
}
