import { describe, expect, it } from 'vitest';
import { formatDate } from '@/lib/dates';
import { formatInstantDay, formatPlainDay } from './formatDay';

describe('formatPlainDay', () => {
    it('uses the house date format', () => {
        expect(formatPlainDay('2026-10-22')).toBe('22 Oct 2026');
        expect(formatPlainDay('2026-03-05')).toBe('5 Mar 2026');
    });

    it('keeps the calendar day of a plain date', () => {
        expect(formatPlainDay('2026-09-01')).toBe(
            formatDate(new Date(2026, 8, 1)),
        );
    });

    it('falls back for empty, nullish and invalid values', () => {
        expect(formatPlainDay(null)).toBe('—');
        expect(formatPlainDay(undefined)).toBe('—');
        expect(formatPlainDay('')).toBe('—');
        expect(formatPlainDay('not-a-date')).toBe('—');
        expect(formatPlainDay('2026-13-01', 'n/a')).toBe('n/a');
    });
});

describe('formatInstantDay', () => {
    it('formats an ISO instant using the local calendar day', () => {
        const iso = new Date(2026, 9, 22, 12, 0, 0).toISOString();

        expect(formatInstantDay(iso)).toBe('22 Oct 2026');
    });

    it('falls back for empty and invalid values', () => {
        expect(formatInstantDay(null)).toBe('—');
        expect(formatInstantDay('garbage')).toBe('—');
        expect(formatInstantDay('', 'none')).toBe('none');
    });
});
