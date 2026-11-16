import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const router = vi.hoisted(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    on: vi.fn(() => () => {}),
}));

vi.mock('@inertiajs/react', () => ({ router }));

import { useOverlayHistory } from './use-overlay-history';

describe('useOverlayHistory', () => {
    it('keeps a back that closes the overlay away from Inertia', () => {
        window.history.replaceState({ page: {} }, '', '/apps/our-history');
        const inertiaPopstate = vi.fn();
        window.addEventListener('popstate', inertiaPopstate);

        const onBack = vi.fn();
        const { rerender, unmount } = renderHook(
            ({ open }) =>
                useOverlayHistory(open, onBack, { param: ['moment', '3'] }),
            { initialProps: { open: false } },
        );

        rerender({ open: true });
        expect(router.push).toHaveBeenCalledWith(
            expect.objectContaining({ url: '/apps/our-history?moment=3' }),
        );

        act(() => {
            window.dispatchEvent(
                new PopStateEvent('popstate', { state: null }),
            );
        });

        expect(onBack).toHaveBeenCalledTimes(1);
        expect(inertiaPopstate).not.toHaveBeenCalled();

        window.removeEventListener('popstate', inertiaPopstate);
        unmount();
    });
});
