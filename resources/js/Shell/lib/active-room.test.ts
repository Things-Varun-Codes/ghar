import { describe, expect, it } from 'vitest';
import { activeMiniApp } from '@/Shell/lib/active-room';
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

const history = app('our-history', 'MiniApps/History/');
const corner = app('our-corner', 'MiniApps/Corner/');

describe('activeMiniApp', () => {
    it('finds the room by the page component', () => {
        expect(
            activeMiniApp(
                [history, corner],
                'MiniApps/Corner/Pages/Songs/Show',
                '/apps/our-corner/songs/4',
            )?.slug,
        ).toBe('our-corner');
    });

    it('falls back to the URL for a shell page inside a room', () => {
        expect(
            activeMiniApp(
                [history, corner],
                'Shell/Pages/Error',
                '/apps/our-corner/songs/999',
            )?.slug,
        ).toBe('our-corner');
    });

    it('does not match a room whose route is only a prefix of the path', () => {
        expect(
            activeMiniApp(
                [app('our-corner')],
                'Shell/Pages/Error',
                '/apps/our-corner-two',
            ),
        ).toBeUndefined();
    });

    it('is empty outside every room', () => {
        expect(
            activeMiniApp(
                [history, corner],
                'Shell/Pages/Settings/Profile',
                '/settings/profile',
            ),
        ).toBeUndefined();
    });
});
