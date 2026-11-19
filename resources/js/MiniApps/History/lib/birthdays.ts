import type { MemberBirthday } from '@/MiniApps/History/lib/types';
import type { Person } from '@/types/person';

function isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/*
 * The members whose birthday falls on a 'Y-m-d' date. Someone born on 29 February has theirs
 * on the 28th in a year without one, as the "on this day" matcher counts it.
 */
export function birthdaysOn(
    date: string,
    birthdays: MemberBirthday[],
): Person[] {
    const [year, month, day] = date.split('-').map(Number);

    if (!year || !month || !day) {
        return [];
    }

    return birthdays
        .filter(
            (b) =>
                b.month === month &&
                (b.day === day ||
                    (b.day === 29 &&
                        month === 2 &&
                        day === 28 &&
                        !isLeapYear(year))),
        )
        .map((b) => b.person);
}

/* "Meera's", "James'". */
export function possessive(name: string): string {
    return /s$/i.test(name) ? `${name}'` : `${name}'s`;
}

/* A household calls each other by first name: "Meera Rao" is Meera here. */
export function firstName(name: string): string {
    return name.trim().split(/\s+/)[0] || name;
}

/* "Meera's birthday" */
export function birthdayOf(person: Pick<Person, 'name'>): string {
    return `${possessive(firstName(person.name))} birthday`;
}
