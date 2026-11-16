import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import BodyHtml from './BodyHtml';

const rooms = vi.hoisted(() => ({ corner: true }));

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            miniApps: rooms.corner ? [{ slug: 'our-corner' }] : [],
        },
    }),
}));

// Written when the link was made: an old-style link, with a picture from another site.
const story =
    '<p><span data-corner-type="corner.song" data-corner-id="5" data-corner-title="Rain"' +
    ' data-corner-thumbnail="https://images.example.com/old.jpg"' +
    ' data-corner-href="/apps/our-corner/songs/5">Rain</span></p>';

function picture(container: HTMLElement): string | null {
    return container.querySelector('img')?.getAttribute('src') ?? null;
}

describe('a link in a story', () => {
    beforeEach(() => {
        rooms.corner = true;
    });

    it('shows the thing’s picture as it is now', () => {
        const { container } = render(
            <BodyHtml
                html={story}
                links={{
                    'corner.song:5': {
                        thumbnail_url:
                            '/apps/our-corner/items/105/picture?v=abc',
                        icon: 'music',
                    },
                }}
            />,
        );

        expect(picture(container)).toBe(
            `${window.location.origin}/apps/our-corner/items/105/picture?v=abc`,
        );
    });

    it('shows no picture once the thing has none', () => {
        const { container } = render(
            <BodyHtml
                html={story}
                links={{
                    'corner.song:5': { thumbnail_url: null, icon: 'music' },
                }}
            />,
        );

        expect(picture(container)).toBeNull();
    });

    it('falls back to what was written when the thing is gone', () => {
        const { container } = render(<BodyHtml html={story} links={{}} />);

        expect(picture(container)).toBe('https://images.example.com/old.jpg');
        expect(container.querySelector('a')?.getAttribute('href')).toContain(
            '/apps/our-corner/songs/5',
        );
    });

    it('is plain text, without a picture, while Corner is off', () => {
        rooms.corner = false;
        const { container } = render(
            <BodyHtml
                html={story}
                links={{
                    'corner.song:5': {
                        thumbnail_url:
                            '/apps/our-corner/items/105/picture?v=abc',
                    },
                }}
            />,
        );

        expect(container.querySelector('a')).toBeNull();
        expect(picture(container)).toBeNull();
        expect(container.textContent).toContain('Rain');
    });
});
