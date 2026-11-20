import type { Person } from '@/types/person';

export type DoneMark = { person: Person; on: string };

/* Past three names a sticker stops being glanceable. */
const NAMED = 3;

/*
 * "Loved by Meera", "Loved by you and Meera", "Loved by you, Meera and 2 more". The viewer is
 * "you" and comes first; everyone else keeps the order they marked it in.
 */
export function doneByLine(
    label: string,
    marks: DoneMark[],
    viewerId: number | null,
): string {
    if (marks.length === 0) {
        return label;
    }

    const mine = marks.some((m) => m.person.id === viewerId);
    const others = marks
        .filter((m) => m.person.id !== viewerId)
        .map((m) => m.person.name);
    const names = mine ? ['you', ...others] : others;

    if (names.length > NAMED) {
        const shown = names.slice(0, NAMED - 1);

        return `${label} by ${shown.join(', ')} and ${names.length - shown.length} more`;
    }

    if (names.length === 1) {
        return `${label} by ${names[0]}`;
    }

    return `${label} by ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
