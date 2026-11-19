import { describe, expect, it } from 'vitest';
import { birthdayOf, birthdaysOn, firstName, possessive } from './birthdays';
import type { MemberBirthday } from './types';

const meera = { id: 3, name: 'Meera', avatar_url: null };
const leapling = { id: 4, name: 'Kabir', avatar_url: null };

const birthdays: MemberBirthday[] = [
    { person: meera, month: 11, day: 20 },
    { person: leapling, month: 2, day: 29 },
];

describe('birthdaysOn', () => {
    it('matches the month and day in any year', () => {
        expect(birthdaysOn('2022-11-20', birthdays)).toEqual([meera]);
        expect(birthdaysOn('1999-11-20', birthdays)).toEqual([meera]);
    });

    it('matches nobody on another day', () => {
        expect(birthdaysOn('2022-11-21', birthdays)).toEqual([]);
        expect(birthdaysOn('2022-10-20', birthdays)).toEqual([]);
    });

    it('puts 29 February on the 28th only in a year without one', () => {
        expect(birthdaysOn('2023-02-28', birthdays)).toEqual([leapling]);
        expect(birthdaysOn('2024-02-28', birthdays)).toEqual([]);
        expect(birthdaysOn('2024-02-29', birthdays)).toEqual([leapling]);
        expect(birthdaysOn('1900-02-28', birthdays)).toEqual([leapling]);
        expect(birthdaysOn('2000-02-28', birthdays)).toEqual([]);
    });

    it('matches nobody while the date is empty or partial', () => {
        expect(birthdaysOn('', birthdays)).toEqual([]);
        expect(birthdaysOn('2024-11', birthdays)).toEqual([]);
    });

    it('returns everyone born that day', () => {
        const twin = { id: 9, name: 'Asha', avatar_url: null };

        expect(
            birthdaysOn('2020-11-20', [
                ...birthdays,
                { person: twin, month: 11, day: 20 },
            ]),
        ).toEqual([meera, twin]);
    });
});

describe('possessive', () => {
    it('adds an apostrophe s, or just the apostrophe after an s', () => {
        expect(possessive('Meera')).toBe("Meera's");
        expect(possessive('James')).toBe("James'");
    });
});

describe('birthdayOf', () => {
    it('says it with the first name', () => {
        expect(birthdayOf({ name: 'Meera Rao' })).toBe("Meera's birthday");
        expect(birthdayOf({ name: 'James' })).toBe("James' birthday");
        expect(firstName('  Asha  Rao ')).toBe('Asha');
    });
});
