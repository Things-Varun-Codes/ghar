import { afterEach, describe, expect, it } from 'vitest';

import { setRegion } from '@/lib/dates';

import {
    formatMoney,
    leftToAssign,
    MAX_AMOUNT,
    moneyInput,
    parseMoney,
} from './money';

function use(locale: string, currency: string) {
    setRegion({ timezone: 'UTC', locale, week_start: 1, currency });
}

afterEach(() => use('en-GB', 'INR'));

describe('formatMoney', () => {
    it('takes the fraction digits from the currency', () => {
        use('en-IN', 'INR');
        expect(formatMoney(240050)).toBe('₹2,400.50');
        expect(formatMoney(12345678)).toBe('₹1,23,456.78');

        use('ja-JP', 'JPY');
        expect(formatMoney(2400)).toMatch(/2,400$/);

        use('en-GB', 'KWD');
        expect(formatMoney(1500)).toContain('1.500');
    });

    it('is exact at the cap', () => {
        use('en-GB', 'INR');
        expect(formatMoney(MAX_AMOUNT)).toBe('₹999,999,999.99');
    });
});

describe('parseMoney', () => {
    it('reads plain and grouped amounts into minor units', () => {
        use('en-IN', 'INR');
        expect(parseMoney('1,234.50')).toBe(123450);
        expect(parseMoney('1234.5')).toBe(123450);
        expect(parseMoney('12')).toBe(1200);
        expect(parseMoney(' 12. ')).toBe(1200);
        expect(parseMoney('.5')).toBe(50);
        expect(parseMoney('0')).toBe(0);
        expect(parseMoney('007')).toBe(700);
    });

    it('never lands a unit off where floats would', () => {
        use('en-IN', 'INR');
        // 0.1 + 0.2, 1.15 * 100 and 4.35 * 100 all miss as doubles.
        expect(parseMoney('0.1')! + parseMoney('0.2')!).toBe(30);
        expect(parseMoney('1.15')).toBe(115);
        expect(parseMoney('4.35')).toBe(435);
        expect(parseMoney('8.2')).toBe(820);
        expect(parseMoney('1005.01')).toBe(100501);
    });

    it('follows the currency: none for JPY, three for KWD', () => {
        use('ja-JP', 'JPY');
        expect(parseMoney('1,234')).toBe(1234);
        expect(parseMoney('12.5')).toBeNull();

        use('en-GB', 'KWD');
        expect(parseMoney('1.5')).toBe(1500);
        expect(parseMoney('1.234')).toBe(1234);
        expect(parseMoney('1.2345')).toBeNull();
    });

    it('refuses what is not an amount', () => {
        use('en-IN', 'INR');

        for (const text of [
            '',
            ' ',
            '.',
            '-5',
            '+5',
            '1.234',
            'abc',
            '12a',
            '1.2.3',
            '1e3',
        ]) {
            expect(parseMoney(text)).toBeNull();
        }
    });

    it('stops at the cap', () => {
        use('en-IN', 'INR');
        expect(parseMoney('999999999.99')).toBe(MAX_AMOUNT);
        expect(parseMoney('1000000000')).toBeNull();
        expect(parseMoney('99999999999999999999')).toBeNull();
    });

    it('round-trips through the field text', () => {
        for (const [locale, currency] of [
            ['en-IN', 'INR'],
            ['ja-JP', 'JPY'],
            ['en-GB', 'KWD'],
        ]) {
            use(locale, currency);

            for (const minor of [
                0,
                1,
                10,
                99,
                100,
                123450,
                240000,
                MAX_AMOUNT,
            ]) {
                expect(parseMoney(moneyInput(minor))).toBe(minor);
            }
        }
    });
});

describe('leftToAssign', () => {
    it('is the total less every share, in whole units', () => {
        expect(leftToAssign(150000, [90000, 60000])).toBe(0);
        expect(leftToAssign(150000, [90000, null])).toBe(60000);
        expect(leftToAssign(30, [10, 10, 10])).toBe(0);
    });

    it('goes negative when the shares run over', () => {
        expect(leftToAssign(1000, [600, 600])).toBe(-200);
    });

    it('waits for a total', () => {
        expect(leftToAssign(null, [100])).toBeNull();
    });
});
