import { afterEach, describe, expect, it } from 'vitest';
import { setRegion } from '@/lib/dates';
import { relativeTime } from './relativeTime';

const NOW = Date.UTC(2026, 10, 20, 12, 0, 0);
const ago = (seconds: number) => new Date(NOW - seconds * 1000).toISOString();

afterEach(() =>
    setRegion({
        timezone: 'UTC',
        locale: 'en-GB',
        week_start: 1,
        currency: 'INR',
    }),
);

describe('relativeTime', () => {
    it('counts up through minutes, hours and days in the household locale', () => {
        expect(relativeTime(ago(30), NOW)).toBe('now');
        expect(relativeTime(ago(5 * 60), NOW)).toBe('5 min ago');
        expect(relativeTime(ago(3 * 3600), NOW)).toBe('3 hr ago');
        expect(relativeTime(ago(12 * 86400), NOW)).toBe('12 days ago');
    });

    it('keeps a number for one day rather than saying yesterday', () => {
        expect(relativeTime(ago(30 * 3600), NOW)).toBe('1 day ago');
    });

    it('turns to the date after thirty days', () => {
        expect(relativeTime(ago(29 * 86400), NOW)).toBe('29 days ago');
        expect(relativeTime(ago(40 * 86400), NOW)).toBe('11 Oct 2026');
    });

    it('follows the locale', () => {
        setRegion({
            timezone: 'America/New_York',
            locale: 'en-US',
            week_start: 0,
            currency: 'INR',
        });

        expect(relativeTime(ago(5 * 60), NOW)).toBe('5m ago');
        expect(relativeTime(ago(3 * 3600), NOW)).toBe('3h ago');
    });
});
