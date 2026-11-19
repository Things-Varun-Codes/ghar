import { describe, expect, it } from 'vitest';
import { pageTitle } from '@/lib/title';

describe('pageTitle', () => {
    it('joins page and room with a middle dot', () => {
        expect(pageTitle('Songs', 'Our Shelf')).toBe('Songs · Our Shelf');
    });

    it('returns the page alone without a room', () => {
        expect(pageTitle('Home')).toBe('Home');
    });
});
