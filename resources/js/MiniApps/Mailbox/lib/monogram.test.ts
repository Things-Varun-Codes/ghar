import { describe, expect, it } from 'vitest';
import { monogram } from './monogram';

describe('monogram', () => {
    it('joins the uppercased initials of each name', () => {
        expect(monogram('alex doe', 'Sam Roe')).toBe('A&S');
    });

    it('skips blank names', () => {
        expect(monogram('Alex', '  ')).toBe('A');
    });
});
