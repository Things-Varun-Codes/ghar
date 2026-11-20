import { describe, expect, it } from 'vitest';
import { formatInstantDay, formatPlainDay } from './formatDay';

describe('formatPlainDay', () => {
    it('uses the house date format', () => {
        expect(formatPlainDay('2026-10-22')).toBe('22 Oct 2026');
        expect(formatPlainDay('2026-03-05')).toBe('5 Mar 2026');
    });

    it('keeps the calendar day of a plain date', () => {
        expect(formatPlainDay('2026-09-01')).toBe('1 Sept 2026');
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
    it("formats an ISO instant on the household's calendar day", () => {
        expect(formatInstantDay('2026-10-22T12:00:00Z')).toBe('22 Oct 2026');
    });

    it('falls back for empty and invalid values', () => {
        expect(formatInstantDay(null)).toBe('—');
        expect(formatInstantDay('garbage')).toBe('—');
        expect(formatInstantDay('', 'none')).toBe('none');
    });
});
