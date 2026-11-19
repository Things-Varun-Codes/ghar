import { act, fireEvent, render, screen } from '@testing-library/react';
import {
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import EntityLinkPickerDialog from './EntityLinkPickerDialog';

vi.mock('@inertiajs/react', () => ({
    router: { push: vi.fn(), replace: vi.fn(), on: vi.fn(() => () => {}) },
    usePage: () => ({ props: {} }),
}));

beforeAll(() => {
    window.matchMedia ??= ((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
    })) as typeof window.matchMedia;
    Element.prototype.scrollIntoView ??= () => {};
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as unknown as typeof ResizeObserver;
});

const results = [
    {
        type: 'corner.song',
        id: 5,
        title: 'Rain',
        group: 'Songs',
        icon: 'music',
    },
    {
        type: 'corner.song',
        id: 6,
        title: 'Rainbow',
        group: 'Songs',
        icon: 'music',
    },
    {
        type: 'history.event',
        id: 9,
        title: 'Rainy drive',
        group: 'Moments',
        icon: null,
    },
];

async function search(text: string) {
    fireEvent.change(screen.getByRole('combobox'), {
        target: { value: text },
    });
    await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
    });
}

describe('EntityLinkPickerDialog', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({
                ok: true,
                status: 200,
                json: async () => ({ results }),
            })),
        );
        window.history.replaceState({ page: {} }, '', '/apps/our-history');
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('moves through the results with the arrow keys and picks with Enter', async () => {
        const onSelect = vi.fn();
        const onOpenChange = vi.fn();
        render(
            <EntityLinkPickerDialog
                open
                onOpenChange={onOpenChange}
                onSelect={onSelect}
            />,
        );

        await search('rain');

        const input = screen.getByRole('combobox');
        expect(screen.getAllByRole('option')).toHaveLength(3);
        expect(screen.getByRole('group', { name: 'Moments' })).toBeTruthy();

        fireEvent.keyDown(input, { key: 'ArrowDown' });
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(onSelect).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'corner.song', id: 6 }),
        );
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('wraps from the last result to the first', async () => {
        const onSelect = vi.fn();
        render(
            <EntityLinkPickerDialog
                open
                onOpenChange={vi.fn()}
                onSelect={onSelect}
            />,
        );

        await search('rain');
        const input = screen.getByRole('combobox');
        fireEvent.keyDown(input, { key: 'ArrowUp' });
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(onSelect).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'history.event', id: 9 }),
        );
    });

    it('lets digits be searched for', async () => {
        const onSelect = vi.fn();
        render(
            <EntityLinkPickerDialog
                open
                onOpenChange={vi.fn()}
                onSelect={onSelect}
            />,
        );

        await search('2024');

        expect(onSelect).not.toHaveBeenCalled();
        expect((screen.getByRole('combobox') as HTMLInputElement).value).toBe(
            '2024',
        );
    });

    it('asks for two characters before searching', async () => {
        render(
            <EntityLinkPickerDialog
                open
                onOpenChange={vi.fn()}
                onSelect={vi.fn()}
            />,
        );

        await search('r');

        expect(fetch).not.toHaveBeenCalled();
        expect(
            screen.getByText('Type at least 2 characters to search.'),
        ).toBeTruthy();
    });
});
