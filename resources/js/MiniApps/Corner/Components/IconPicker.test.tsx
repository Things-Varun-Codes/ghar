import {
    act,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/use-breakpoint', () => ({ useIsPhone: () => false }));
vi.mock('@/hooks/use-overlay-history', () => ({
    useOverlayHistory: () => undefined,
}));

import IconPicker from '@/MiniApps/Corner/Components/IconPicker';

/*
 * jsdom lays nothing out, so the scroller is given the popover's size: 300px tall and wide
 * enough for seven columns, as on a laptop.
 */
const box = { clientHeight: 300, clientWidth: 344 };
const saved = new Map<string, PropertyDescriptor | undefined>();

beforeAll(() => {
    for (const [name, value] of Object.entries(box)) {
        saved.set(
            name,
            Object.getOwnPropertyDescriptor(HTMLElement.prototype, name),
        );
        Object.defineProperty(HTMLElement.prototype, name, {
            configurable: true,
            get: () => value,
        });
    }

    vi.stubGlobal(
        'ResizeObserver',
        class {
            observe() {}
            unobserve() {}
            disconnect() {}
        },
    );
});

afterAll(() => {
    for (const [name, descriptor] of saved) {
        if (descriptor) {
            Object.defineProperty(HTMLElement.prototype, name, descriptor);
        } else {
            delete (
                HTMLElement.prototype as unknown as Record<string, unknown>
            )[name];
        }
    }

    vi.unstubAllGlobals();
});

async function openPicker(onChange = vi.fn()) {
    render(<IconPicker value="music" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /music/i }));

    const grid = await screen.findByRole('listbox', { name: 'Icons' });
    const scroller = grid.parentElement as HTMLElement;

    // jsdom keeps no scroll position: this one does, and says so the way a browser would.
    let top = 0;
    Object.defineProperty(scroller, 'scrollHeight', {
        configurable: true,
        get: () => Number.parseInt(grid.style.height, 10),
    });
    Object.defineProperty(scroller, 'scrollTop', {
        configurable: true,
        get: () => top,
        set: (value: number) => {
            top = value;
        },
    });
    scroller.scrollTo = ((options: ScrollToOptions) => {
        top = options.top ?? top;
        scroller.dispatchEvent(new Event('scroll'));
    }) as typeof scroller.scrollTo;

    return { grid, scroller, onChange };
}

// The grid's options, not the category picker's.
const icons = () => within(screen.getByRole('listbox')).getAllByRole('option');
const optionIds = () => icons().map((option) => option.id);

describe('the icon grid', () => {
    it('draws only the rows near the visible band', async () => {
        const { grid } = await openPicker();
        const shown = icons();

        // Every icon is well over a thousand; a 300px band holds a handful of rows.
        expect(shown.length).toBeGreaterThan(7);
        expect(shown.length).toBeLessThan(140);
        expect(Number.parseInt(grid.style.height, 10)).toBeGreaterThan(10_000);
    });

    it('draws other rows once it is scrolled', async () => {
        const { scroller } = await openPicker();
        const before = optionIds();

        act(() => {
            scroller.scrollTop = 6000;
            fireEvent.scroll(scroller);
        });

        const after = optionIds();

        expect(after.length).toBeGreaterThan(0);
        expect(after.some((id) => before.includes(id))).toBe(false);
    });

    it('keeps the active icon drawn as the arrows move past the band', async () => {
        await openPicker();
        const search = screen.getByRole('combobox', { name: 'Search icons' });

        for (let i = 0; i < 12; i++) {
            fireEvent.keyDown(search, { key: 'ArrowDown' });
        }

        const active = search.getAttribute('aria-activedescendant');

        expect(active).toBeTruthy();
        await waitFor(() =>
            expect(document.getElementById(active as string)).not.toBeNull(),
        );
    });

    it('chooses the best match with Enter', async () => {
        const { onChange } = await openPicker();
        const search = screen.getByRole('combobox', { name: 'Search icons' });

        fireEvent.change(search, { target: { value: 'pizza' } });

        expect(
            screen.getByRole('listbox', { name: 'Matching icons' }),
        ).toBeTruthy();

        fireEvent.keyDown(search, { key: 'Enter' });

        expect(onChange).toHaveBeenCalledWith('pizza');
    });
});
