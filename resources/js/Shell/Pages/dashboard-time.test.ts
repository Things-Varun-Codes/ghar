import { beforeEach, describe, expect, it } from 'vitest';

import { setRegion } from '@/lib/dates';

import { dayKey, freshnessWeight, shortAgo } from './dashboard-time';

describe('dashboard time', () => {
    beforeEach(() => {
        setRegion({ timezone: 'Asia/Kolkata', locale: 'en-GB', week_start: 1 });
    });

    it('reads an instant on the household clock', () => {
        expect(dayKey('2026-11-19T20:00:00Z')).toBe('2026-11-20');
    });

    it('sets the last day a step stronger', () => {
        const now = new Date('2026-11-20T02:00:00Z');
        expect(freshnessWeight('2026-11-19T19:00:00Z', now)).toBe(600);
        expect(freshnessWeight('2026-11-18T20:00:00Z', now)).toBe(400);
    });

    it('prints a short age', () => {
        const now = new Date('2026-11-20T12:00:00Z');
        expect(shortAgo('2026-11-20T11:59:40Z', now)).toBe('now');
        expect(shortAgo('2026-11-20T11:48:00Z', now)).toBe('12m');
        expect(shortAgo('2026-11-20T09:00:00Z', now)).toBe('3h');
        expect(shortAgo('2026-11-18T12:00:00Z', now)).toBe('2d');
    });
});
