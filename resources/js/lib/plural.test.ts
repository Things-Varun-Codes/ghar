import { describe, expect, it } from 'vitest';
import { count } from '@/lib/plural';

describe('count', () => {
    it('uses the singular for exactly one', () => {
        expect(count(1, 'moment')).toBe('1 moment');
    });

    it('adds an s for zero and for more than one', () => {
        expect(count(0, 'moment')).toBe('0 moments');
        expect(count(3, 'moment')).toBe('3 moments');
    });

    it('takes an irregular plural', () => {
        expect(count(2, 'library', 'libraries')).toBe('2 libraries');
        expect(count(1, 'library', 'libraries')).toBe('1 library');
    });
});
