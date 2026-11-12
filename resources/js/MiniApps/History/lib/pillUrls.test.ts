import { describe, expect, it } from 'vitest';

import { internalHref, thumbnailSrc } from './pillUrls';

const origin = 'https://ghar.example.com';

describe('internalHref', () => {
    it.each([
        ['/apps/our-corner/songs/3', `${origin}/apps/our-corner/songs/3`],
        [
            `${origin}/apps/our-corner/places/7`,
            `${origin}/apps/our-corner/places/7`,
        ],
    ])('keeps %s', (href, expected) => {
        expect(internalHref(href, origin)).toBe(expected);
    });

    it.each([
        [''],
        ['//evil.example/x'],
        ['/\\evil.example/x'],
        ['\\\\evil.example/x'],
        ['https://evil.example/apps/our-corner/songs/3'],
        ['https://ghar.example.com.evil.example/'],
        ['javascript:alert(1)'],
        ['data:text/html,<script>alert(1)</script>'],
    ])('refuses %s', (href) => {
        expect(internalHref(href, origin)).toBeNull();
    });
});

describe('thumbnailSrc', () => {
    it.each([
        ['https://i.ytimg.com/vi/abc/hqdefault.jpg'],
        ['/storage/thumb.jpg'],
    ])('keeps %s', (src) => {
        expect(thumbnailSrc(src, origin)).not.toBeNull();
    });

    it.each([
        [''],
        ['http://tracker.example/pixel.gif'],
        ['javascript:alert(1)'],
        ['data:image/svg+xml,<svg onload=alert(1)>'],
    ])('refuses %s', (src) => {
        expect(thumbnailSrc(src, origin)).toBeNull();
    });
});
