import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import PlacesLocationField from './PlacesLocationField';

function prediction(placeId: string, main: string, secondary: string) {
    return {
        placeId,
        mainText: { text: main },
        secondaryText: { text: secondary },
        toPlace: () => ({
            id: placeId,
            displayName: main,
            formattedAddress: `${main}, ${secondary}`,
            location: { lat: () => 12.9, lng: () => 77.5 },
            fetchFields: async () => ({}),
        }),
    };
}

const places = vi.hoisted(() => ({
    AutocompleteSessionToken: class {},
    AutocompleteSuggestion: {
        fetchAutocompleteSuggestions: vi.fn(),
    },
}));

vi.mock('@vis.gl/react-google-maps', () => ({
    APIProvider: ({ children }: { children: ReactNode }) => children,
    useMapsLibrary: () => places,
}));

const inertia = vi.hoisted(() => ({
    key: 'test-key' as string | null,
    get: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { googleMapsApiKey: inertia.key } }),
    useHttp: () => ({ get: inertia.get }),
}));

beforeAll(() => {
    Element.prototype.scrollIntoView ??= () => {};
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as unknown as typeof ResizeObserver;
});

async function type(text: string) {
    const input = document.querySelector(
        '[data-test=location-field] input',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: text } });
    await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
    });

    return input;
}

describe('PlacesLocationField', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        places.AutocompleteSuggestion.fetchAutocompleteSuggestions.mockResolvedValue(
            {
                suggestions: [
                    {
                        placePrediction: prediction(
                            'a',
                            'Cubbon Park',
                            'Bengaluru',
                        ),
                    },
                    {
                        placePrediction: prediction(
                            'b',
                            'Cubbonpet',
                            'Bengaluru',
                        ),
                    },
                ],
            },
        );
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('is named for its label and takes typing', async () => {
        render(
            <PlacesLocationField
                label="Location"
                value={null}
                onSelect={vi.fn()}
            />,
        );

        const input = await type('Cubbon');

        expect(screen.getByRole('combobox', { name: 'Location' })).toBe(input);
        expect(input.value).toBe('Cubbon');
        expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(
            ['Cubbon ParkBengaluru', 'CubbonpetBengaluru', 'Use “Cubbon”'],
        );
    });

    it('moves through the suggestions with the arrow keys and picks with Enter', async () => {
        const onSelect = vi.fn();
        render(<PlacesLocationField value={null} onSelect={onSelect} />);

        const input = await type('Cubbon');
        fireEvent.keyDown(input, { key: 'ArrowDown' });
        fireEvent.keyDown(input, { key: 'Enter' });
        await act(async () => {
            await vi.runAllTimersAsync();
        });

        expect(onSelect).toHaveBeenCalledWith(
            expect.objectContaining({ place_id: 'b', name: 'Cubbonpet' }),
        );
    });

    it('closes the suggestions on Escape without letting it reach the sheet', async () => {
        const sheetEscape = vi.fn();
        document.addEventListener('keydown', sheetEscape);
        render(<PlacesLocationField value={null} onSelect={vi.fn()} />);

        const input = await type('Cubbon');
        fireEvent.keyDown(input, { key: 'Escape' });

        expect(screen.queryAllByRole('option')).toHaveLength(0);
        expect(sheetEscape).not.toHaveBeenCalled();

        // With the suggestions closed, Escape is the sheet's again.
        fireEvent.keyDown(input, { key: 'Escape' });
        expect(sheetEscape).toHaveBeenCalledTimes(1);
        document.removeEventListener('keydown', sheetEscape);
    });

    it("doesn't pick a hidden suggestion or submit the form on Enter", async () => {
        const onSelect = vi.fn();
        const onSubmit = vi.fn((e: { preventDefault: () => void }) =>
            e.preventDefault(),
        );
        render(
            <form onSubmit={onSubmit}>
                <PlacesLocationField value={null} onSelect={onSelect} />
            </form>,
        );

        const input = await type('Cubbon');
        fireEvent.keyDown(input, { key: 'Escape' });
        const enter = fireEvent.keyDown(input, { key: 'Enter' });

        expect(enter).toBe(false);
        expect(onSelect).not.toHaveBeenCalled();
    });

    it('keeps what was typed when the place is on no map', async () => {
        const onSelect = vi.fn();
        render(<PlacesLocationField value={null} onSelect={onSelect} />);

        await type("Grandma's house");
        fireEvent.click(screen.getByRole('option', { name: /Use/ }));

        expect(onSelect).toHaveBeenCalledWith({
            place_id: null,
            name: "Grandma's house",
            address: null,
            lat: null,
            lng: null,
        });
    });

    it('searches OpenStreetMap through the server without a Google key', async () => {
        inertia.key = null;
        const place = {
            place_id: 'osm:W1',
            name: 'Cubbon Park',
            address: 'Bengaluru, India',
            lat: 12.97,
            lng: 77.59,
        };
        inertia.get.mockResolvedValue({ results: [place] });
        const onSelect = vi.fn();
        render(<PlacesLocationField value={null} onSelect={onSelect} />);

        const input = await type('Cubbon');
        fireEvent.keyDown(input, { key: 'Enter' });
        await act(async () => {
            await vi.runAllTimersAsync();
        });

        expect(inertia.get).toHaveBeenCalledWith(
            expect.stringContaining('/api/places/search?q=Cubbon'),
        );
        expect(
            places.AutocompleteSuggestion.fetchAutocompleteSuggestions,
        ).not.toHaveBeenCalled();
        expect(onSelect).toHaveBeenCalledWith(place);
        inertia.key = 'test-key';
    });

    it('shows a chosen place with a way to clear it', () => {
        const onSelect = vi.fn();
        render(
            <PlacesLocationField
                value={{ name: 'Cubbon Park', address: 'Bengaluru' }}
                onSelect={onSelect}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Clear location' }));

        expect(onSelect).toHaveBeenCalledWith(null);
    });
});
