import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const router = vi.hoisted(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    on: vi.fn(() => () => {}),
}));

vi.mock('@inertiajs/react', () => ({ router }));

import app from '../app.tsx?raw';
import {
    installOverlayHistory,
    useOverlayHistory,
} from './use-overlay-history';

describe('overlay history listener order', () => {
    /*
     * Chromium runs window's popstate listeners in the order they were added, even a capture
     * one after a bubble one. Registering Inertia's stand-in as a capture listener makes jsdom
     * dispatch in that order too, so only an earlier install keeps the back away from Inertia.
     */
    it('stops a back before a listener added after install', () => {
        window.history.replaceState({ page: {} }, '', '/apps/our-corner');
        installOverlayHistory();
        const inertiaPopstate = vi.fn();
        window.addEventListener('popstate', inertiaPopstate, { capture: true });

        const onBack = vi.fn();
        const { rerender, unmount } = renderHook(
            ({ open }) => useOverlayHistory(open, onBack),
            { initialProps: { open: false } },
        );
        rerender({ open: true });

        act(() => {
            window.dispatchEvent(
                new PopStateEvent('popstate', { state: { page: {} } }),
            );
        });

        expect(onBack).toHaveBeenCalledTimes(1);
        expect(inertiaPopstate).not.toHaveBeenCalled();

        window.removeEventListener('popstate', inertiaPopstate, {
            capture: true,
        });
        unmount();
    });

    it('is installed by app.tsx before Inertia starts', () => {
        const install = app.indexOf('installOverlayHistory();');

        expect(install).toBeGreaterThan(-1);
        expect(install).toBeLessThan(app.indexOf('createInertiaApp({'));
    });
});
