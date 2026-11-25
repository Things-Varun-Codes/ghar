import { afterEach, describe, expect, it } from 'vitest';
import {
    formatDayMonth,
    formatInstant,
    formatPlainDate,
    monthNames,
    setRegion,
    weekdayNames,
    weekStart,
} from '@/lib/dates';

const KOLKATA = {
    timezone: 'Asia/Kolkata',
    locale: 'en-IN',
    week_start: 0,
    currency: 'INR',
};
const UTC = {
    timezone: 'UTC',
    locale: 'en-GB',
    week_start: 1,
    currency: 'INR',
};

afterEach(() => setRegion(UTC));

describe('formatInstant', () => {
    it('defaults to day, short month and year in the app locale', () => {
        expect(formatInstant('2026-11-15T12:00:00Z')).toBe('15 Nov 2026');
    });

    it('accepts a Date and custom options', () => {
        expect(
            formatInstant(new Date(Date.UTC(2026, 10, 15, 12)), {
                intl: { month: 'long', year: 'numeric' },
            }),
        ).toBe('November 2026');
    });

    it('returns the fallback for empty or invalid input', () => {
        expect(formatInstant(null, { fallback: 'Never' })).toBe('Never');
        expect(formatInstant('not a date')).toBe('');
    });

    it("reads an instant near midnight on the household's clock", () => {
        // 19:00 UTC on the 15th is 00:30 on the 16th in Kolkata.
        const instant = '2026-11-15T19:00:00Z';

        expect(formatInstant(instant)).toBe('15 Nov 2026');

        setRegion(KOLKATA);
        expect(formatInstant(instant)).toBe('16 Nov 2026');
    });

    it("reads in the household's locale once the region is known", () => {
        setRegion({
            timezone: 'America/New_York',
            locale: 'en-US',
            week_start: 0,
            currency: 'INR',
        });

        expect(formatInstant('2026-11-15T17:00:00Z')).toBe('Nov 15, 2026');
        expect(weekStart()).toBe(0);
    });
});

describe('formatPlainDate', () => {
    it('keeps the calendar day whatever the household timezone', () => {
        expect(formatPlainDate('2026-11-15')).toBe('15 Nov 2026');

        setRegion(KOLKATA);
        expect(formatPlainDate('2026-11-15')).toBe('15 Nov 2026');

        setRegion({
            timezone: 'Pacific/Honolulu',
            locale: 'en-US',
            week_start: 0,
            currency: 'INR',
        });
        expect(formatPlainDate('2026-11-15')).toBe('Nov 15, 2026');
    });

    it('takes custom options and falls back on bad input', () => {
        expect(
            formatPlainDate('2026-02-01', {
                intl: { day: 'numeric', month: 'short' },
            }),
        ).toBe('1 Feb');
        expect(formatPlainDate(null, { fallback: '—' })).toBe('—');
        expect(formatPlainDate('2026-13-01')).toBe('');
        expect(formatPlainDate('garbage')).toBe('');
    });
});

describe('names', () => {
    it("names months and weekdays in the household's locale", () => {
        expect(monthNames('long')[0]).toBe('January');
        expect(monthNames('short')).toHaveLength(12);
        expect(weekdayNames('long')[0]).toBe('Sunday');
        expect(weekdayNames('long')[1]).toBe('Monday');

        setRegion({
            timezone: 'Europe/Paris',
            locale: 'fr-FR',
            week_start: 1,
            currency: 'INR',
        });
        expect(monthNames('long')[0]).toBe('janvier');
        expect(weekdayNames('long')[0]).toBe('dimanche');
    });

    it('writes a day of the year the way the locale does', () => {
        expect(formatDayMonth(11, 5)).toBe('5 November');
        expect(formatDayMonth(2, 29)).toBe('29 February');

        setRegion({
            timezone: 'America/New_York',
            locale: 'en-US',
            week_start: 0,
            currency: 'INR',
        });
        expect(formatDayMonth(11, 5)).toBe('November 5');
    });
});
