import { describe, expect, it } from 'vitest';
import { formatDate, setRegion, weekStart } from '@/lib/dates';

describe('formatDate', () => {
    it('defaults to day, short month and year in the app locale', () => {
        expect(formatDate('2026-11-15T12:00:00')).toBe('15 Nov 2026');
    });

    it('accepts a Date and custom options', () => {
        expect(
            formatDate(new Date(2026, 10, 15), {
                intl: { month: 'long', year: 'numeric' },
            }),
        ).toBe('November 2026');
    });

    it('returns the fallback for empty or invalid input', () => {
        expect(formatDate(null, { fallback: 'Never' })).toBe('Never');
        expect(formatDate('not a date')).toBe('');
    });

    it("reads in the household's locale once the region is known", () => {
        setRegion({
            timezone: 'America/New_York',
            locale: 'en-US',
            week_start: 0,
        });

        expect(formatDate('2026-11-15T12:00:00')).toBe('Nov 15, 2026');
        expect(weekStart()).toBe(0);

        setRegion({ timezone: 'UTC', locale: 'en-GB', week_start: 1 });
    });
});
