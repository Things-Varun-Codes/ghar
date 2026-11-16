import { describe, expect, it } from 'vitest';
import { navIconFor, roomsForBar } from '@/Shell/Components/bottom-bar';
import type { MiniApp } from '@/types/miniapp';

function app(slug: string, prefix?: string): MiniApp {
    return {
        name: slug,
        slug,
        route: `/apps/${slug}`,
        description: '',
        component_prefix: prefix,
    };
}

describe('roomsForBar', () => {
    it('keeps Home plus four rooms at most', () => {
        const apps = ['a', 'b', 'c', 'd', 'e', 'f'].map((s) => app(s));

        expect(roomsForBar(apps).map((a) => a.slug)).toEqual([
            'a',
            'b',
            'c',
            'd',
        ]);
    });
});

describe('navIconFor', () => {
    const modules = {
        '../../MiniApps/History/nav-icon.tsx': 'history',
        '../../MiniApps/Corner/nav-icon.tsx': 'corner',
    };

    it('finds the icon module of the room named by component_prefix', () => {
        expect(navIconFor(app('h', 'MiniApps/History/'), modules)).toBe(
            'history',
        );
    });

    it('is undefined without a prefix or a module', () => {
        expect(navIconFor(app('x'), modules)).toBeUndefined();
        expect(
            navIconFor(app('m', 'MiniApps/Mailbox/'), modules),
        ).toBeUndefined();
    });
});
