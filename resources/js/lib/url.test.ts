import { describe, expect, it } from 'vitest';

import { hasParam, pathOf, withParam, withoutParam } from './url';

describe('pathOf', () => {
    it('drops the query, hash and trailing slash', () => {
        expect(pathOf('/apps/our-corner/songs/?q=x#top')).toBe(
            '/apps/our-corner/songs',
        );
        expect(pathOf('/')).toBe('/');
        expect(pathOf('/?q=x')).toBe('/');
    });
});

describe('query param helpers', () => {
    it('sets and removes one query param, keeping the rest', () => {
        expect(
            withParam('/apps/our-history?order=oldest-first', 'moment', '4'),
        ).toBe('/apps/our-history?order=oldest-first&moment=4');
        expect(
            withoutParam(
                '/apps/our-history?moment=4&order=oldest-first',
                'moment',
            ),
        ).toBe('/apps/our-history?order=oldest-first');
        expect(withoutParam('/apps/our-corner/songs', null)).toBe(
            '/apps/our-corner/songs',
        );
        expect(hasParam('/apps/our-history?moment=4', 'moment')).toBe(true);
        expect(hasParam('/apps/our-history', 'moment')).toBe(false);
    });
});
