import { router } from '@inertiajs/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultParent, goBack } from '@/lib/back-navigation';
import {
    previousPath,
    recordNavigation,
    resetNavigationForTests,
} from '@/lib/navigation';

vi.mock('@inertiajs/react', () => ({
    router: { visit: vi.fn() },
}));

describe('defaultParent', () => {
    const rooms = [
        { name: 'Our Recipes', route: '/apps/our-recipes' },
        { name: 'Our Garden', route: '/apps/our-garden' },
    ];

    it('takes a page inside a room back to that room, named from the registry', () => {
        expect(defaultParent('/apps/our-recipes/soups', rooms)).toEqual({
            href: '/apps/our-recipes',
            label: 'Our Recipes',
        });
        expect(defaultParent('/apps/our-garden/beds/4', rooms)).toEqual({
            href: '/apps/our-garden',
            label: 'Our Garden',
        });
    });

    it('takes a room landing home', () => {
        expect(defaultParent('/apps/our-recipes', rooms)).toEqual({
            href: '/dashboard',
            label: 'Home',
        });
    });

    it('does not mistake a room whose route is a prefix of another for it', () => {
        expect(
            defaultParent('/apps/our-recipes-old/1', [
                { name: 'Our Recipes', route: '/apps/our-recipes' },
            ]),
        ).toEqual({ href: '/dashboard', label: 'Home' });
    });

    it('takes a page in a room the viewer cannot see, and a shell page, home', () => {
        expect(defaultParent('/apps/our-attic/boxes', rooms)).toEqual({
            href: '/dashboard',
            label: 'Home',
        });
        expect(defaultParent('/settings/profile', rooms)).toEqual({
            href: '/dashboard',
            label: 'Home',
        });
        expect(defaultParent('/admin/users', [])).toEqual({
            href: '/dashboard',
            label: 'Home',
        });
    });
});

describe('goBack', () => {
    beforeEach(() => {
        resetNavigationForTests();
        vi.clearAllMocks();
    });

    it('steps back through history when the parent is the previous page', () => {
        const back = vi
            .spyOn(window.history, 'back')
            .mockImplementation(() => {});

        recordNavigation('/apps/our-shelf/songs?q=rain');
        recordNavigation('/apps/our-shelf/songs/4');
        goBack('/apps/our-shelf/songs');

        expect(back).toHaveBeenCalledTimes(1);
        expect(router.visit).not.toHaveBeenCalled();
    });

    it('replaces the entry when the parent is not where we came from', () => {
        const back = vi
            .spyOn(window.history, 'back')
            .mockImplementation(() => {});

        recordNavigation('/dashboard');
        recordNavigation('/apps/our-shelf/songs/4');
        goBack('/apps/our-shelf/songs');

        expect(back).not.toHaveBeenCalled();
        expect(router.visit).toHaveBeenCalledWith('/apps/our-shelf/songs', {
            replace: true,
        });
    });

    it('replaces the entry on a first page with no history', () => {
        recordNavigation('/apps/our-shelf/songs/4');
        goBack('/apps/our-shelf/songs');

        expect(router.visit).toHaveBeenCalledWith('/apps/our-shelf/songs', {
            replace: true,
        });
    });

    it('keeps the previous page across same-path visits', () => {
        recordNavigation('/dashboard');
        recordNavigation('/apps/our-shelf/songs');
        recordNavigation('/apps/our-shelf/songs?q=rain', 'replace');

        expect(previousPath()).toBe('/dashboard');
    });

    it('steps back again from a page it reached by stepping back', () => {
        const back = vi
            .spyOn(window.history, 'back')
            .mockImplementation(() => {});

        recordNavigation('/apps/our-shelf');
        recordNavigation('/apps/our-shelf/songs');
        recordNavigation('/apps/our-shelf/songs/4');
        recordNavigation('/apps/our-shelf/songs', 'history');
        goBack('/apps/our-shelf');

        expect(back).toHaveBeenCalledTimes(1);
        expect(router.visit).not.toHaveBeenCalled();
    });
});
