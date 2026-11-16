import { router } from '@inertiajs/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { goBack } from '@/lib/back-navigation';
import {
    previousPath,
    recordNavigation,
    resetNavigationForTests,
} from '@/lib/navigation';

vi.mock('@inertiajs/react', () => ({
    router: { visit: vi.fn() },
}));

describe('goBack', () => {
    beforeEach(() => {
        resetNavigationForTests();
        vi.clearAllMocks();
    });

    it('steps back through history when the parent is the previous page', () => {
        const back = vi
            .spyOn(window.history, 'back')
            .mockImplementation(() => {});

        recordNavigation('/apps/our-corner/songs?q=rain');
        recordNavigation('/apps/our-corner/songs/4');
        goBack('/apps/our-corner/songs');

        expect(back).toHaveBeenCalledTimes(1);
        expect(router.visit).not.toHaveBeenCalled();
    });

    it('replaces the entry when the parent is not where we came from', () => {
        const back = vi
            .spyOn(window.history, 'back')
            .mockImplementation(() => {});

        recordNavigation('/dashboard');
        recordNavigation('/apps/our-corner/songs/4');
        goBack('/apps/our-corner/songs');

        expect(back).not.toHaveBeenCalled();
        expect(router.visit).toHaveBeenCalledWith('/apps/our-corner/songs', {
            replace: true,
        });
    });

    it('replaces the entry on a first page with no history', () => {
        recordNavigation('/apps/our-corner/songs/4');
        goBack('/apps/our-corner/songs');

        expect(router.visit).toHaveBeenCalledWith('/apps/our-corner/songs', {
            replace: true,
        });
    });

    it('keeps the previous page across same-path visits', () => {
        recordNavigation('/dashboard');
        recordNavigation('/apps/our-corner/songs');
        recordNavigation('/apps/our-corner/songs?q=rain', 'replace');

        expect(previousPath()).toBe('/dashboard');
    });

    it('steps back again from a page it reached by stepping back', () => {
        const back = vi
            .spyOn(window.history, 'back')
            .mockImplementation(() => {});

        recordNavigation('/apps/our-corner');
        recordNavigation('/apps/our-corner/songs');
        recordNavigation('/apps/our-corner/songs/4');
        recordNavigation('/apps/our-corner/songs', 'history');
        goBack('/apps/our-corner');

        expect(back).toHaveBeenCalledTimes(1);
        expect(router.visit).not.toHaveBeenCalled();
    });
});
