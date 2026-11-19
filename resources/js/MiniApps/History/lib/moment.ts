import type { HistoryEvent } from '@/MiniApps/History/lib/types';

/* The place to print for a moment: its name, or the address when the name is already in it. */
export function displayLocation(
    event: Pick<
        HistoryEvent,
        'location_name' | 'location_address' | 'location_freetext'
    >,
): string | null {
    const { location_name, location_address, location_freetext } = event;

    if (location_name && !location_address) {
        return location_name;
    }

    if (location_name && location_address) {
        return location_address.includes(location_name)
            ? location_address
            : location_name;
    }

    return location_address || location_freetext || null;
}

/*
 * A story as one run of plain text, for the line a Timeline card shows. DOMParser builds an
 * inert document: nothing in it loads or runs.
 */
export function storyText(html: string | null): string {
    if (!html) {
        return '';
    }

    const doc = new DOMParser().parseFromString(html, 'text/html');

    // A heading has no full stop, so it gets a dot or it runs into the sentence after it.
    doc.body
        .querySelectorAll('h1, h2, h3, h4')
        .forEach((el) => el.after(' · '));
    doc.body
        .querySelectorAll('p, li, blockquote, br')
        .forEach((el) => el.after(' '));

    return (doc.body.textContent ?? '')
        .replace(/\s+/g, ' ')
        .replace(/^[\s·]+|[\s·]+$/g, '')
        .replace(/(?: ·)+ ·/g, ' ·');
}
