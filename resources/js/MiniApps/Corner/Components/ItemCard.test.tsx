import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

const { routerDelete } = vi.hoisted(() => ({ routerDelete: vi.fn() }));

vi.mock('@inertiajs/react', () => ({
    router: { patch: vi.fn(), delete: routerDelete },
    // The viewer is Asha (id 1), so a sticker can say "you".
    usePage: () => ({ props: { auth: { user: { id: 1 } } } }),
    Link: ({
        href,
        children,
        ...rest
    }: {
        href: string;
        children: ReactNode;
    }) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));

const { toastFn } = vi.hoisted(() => {
    const fn = vi.fn(() => 'toast-id') as Mock & {
        dismiss: Mock;
        error: Mock;
    };
    fn.dismiss = vi.fn();
    fn.error = vi.fn();

    return { toastFn: fn };
});

vi.mock('sonner', () => ({ toast: toastFn }));

import ItemCard from '@/MiniApps/Corner/Components/ItemCard';
import { DELETE_GRACE_PERIOD_MS } from '@/MiniApps/Corner/Hooks/useItemActions';
import type { CornerItem, CornerListInfo } from '@/MiniApps/Corner/lib/types';

const list: CornerListInfo = {
    id: 1,
    slug: 'songs',
    name: 'Songs',
    icon: 'music',
    done_label: 'Loved',
    todo_label: 'To hear',
    done_icon: 'heart',
    notify_on_add: true,
    done_per_person: false,
    can: { update: true, delete: true },
    delete_needs_admin: false,
};

function itemWith(overrides: Partial<CornerItem> = {}): CornerItem {
    return {
        id: 7,
        title: 'Yellow',
        notes: null,
        url: null,
        site_name: null,
        author: null,
        image_url: null,
        picture_url: null,
        location_label: null,
        location_url: null,
        lat: null,
        lng: null,
        address: null,
        is_done: false,
        can: { update: true, delete: true },
        addedBy: { id: 2, name: 'Ravi Rao', avatar_url: null },
        done_by: [],
        ...overrides,
    };
}

type UndoOptions = { action: { onClick: () => void } };

describe('ItemCard', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        routerDelete.mockClear();
        toastFn.mockClear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('keeps exactly one link into the room, to the item', () => {
        render(
            <ItemCard
                list={list}
                item={itemWith({ url: 'https://example.com' })}
            />,
        );

        const internal = screen
            .getAllByRole('link')
            .filter((link) => link.getAttribute('href')?.startsWith('/'));

        expect(internal.map((link) => link.getAttribute('href'))).toEqual([
            '/apps/our-shelf/songs/7',
        ]);
    });

    it('names who added it beside their face', () => {
        const { container } = render(
            <ItemCard list={list} item={itemWith()} />,
        );

        expect(screen.getByText('Ravi Rao')).toBeTruthy();
        expect(container.querySelector('[data-slot="avatar"]')).not.toBeNull();
    });

    it('says who marked it done on its sticker', () => {
        render(
            <ItemCard
                list={list}
                item={itemWith({
                    is_done: true,
                    done_by: [
                        {
                            person: { id: 3, name: 'Meera', avatar_url: null },
                            on: '2026-10-12',
                        },
                    ],
                })}
            />,
        );

        expect(screen.getByText(`${list.done_label} by Meera`)).toBeTruthy();
    });

    it('folds away on delete and comes back on Undo, with no request', async () => {
        render(<ItemCard list={list} item={itemWith()} />);

        fireEvent.click(
            screen.getByRole('button', { name: 'Actions for Yellow' }),
        );
        fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
        // The fold's exit settles over a couple of frames, well inside the grace period.
        await act(async () => {
            await vi.advanceTimersByTimeAsync(100);
        });

        expect(screen.queryByText('Yellow')).toBeNull();

        const [, options] = toastFn.mock.calls[0] as unknown as [
            string,
            UndoOptions,
        ];
        act(() => {
            options.action.onClick();
        });

        expect(screen.getByText('Yellow')).toBeTruthy();

        act(() => {
            vi.advanceTimersByTime(DELETE_GRACE_PERIOD_MS + 100);
        });

        expect(routerDelete).not.toHaveBeenCalled();
    });

    it('shows the sticker once something is marked done', () => {
        const { rerender } = render(<ItemCard list={list} item={itemWith()} />);

        expect(screen.queryByText('Loved')).toBeNull();

        rerender(<ItemCard list={list} item={itemWith({ is_done: true })} />);

        expect(screen.getByText('Loved')).toBeTruthy();
    });
});
