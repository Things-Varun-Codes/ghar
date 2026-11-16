import { router } from '@inertiajs/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    goBack,
    previousUrl,
    recordNavigation,
    resetNavigationForTests,
} from '@/lib/back-navigation';

vi.mock('@inertiajs/react', () => ({
    router: { visit: vi.fn() },
}));

describe('goBack', () => {
    beforeEach(() => {
        resetNavigationForTests();
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
        recordNavigation('/apps/our-corner/songs?q=rain');

        expect(previousUrl()).toBe('/dashboard');
    });
});
