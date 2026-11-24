import type { MediaItem } from '@/MiniApps/History/Components/MediaGrid';
import type { HistoryEvent } from '@/MiniApps/History/lib/types';
import type { LightboxItem } from '@/Shell/Components/MediaLightbox';

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

/* A moment's media that can open, as the lightbox shows it: a photo or video still uploading has no original yet. */
export function lightboxMedia(
    event: Pick<HistoryEvent, 'media' | 'title' | 'date_label'>,
): { media: (MediaItem & { original: string })[]; slides: LightboxItem[] } {
    const media = event.media.filter(
        (m): m is MediaItem & { original: string } => m.original !== null,
    );
    const from = event.title || event.date_label;

    return {
        media,
        slides: media.map((m) => ({
            kind: m.kind,
            medium: m.medium,
            large: m.large,
            original: m.original,
            poster: m.poster,
            width: m.width,
            height: m.height,
            alt: `${m.kind === 'video' ? 'Video' : 'Photo'} from ${from}`,
            title: event.title ?? undefined,
            subtitle: event.date_label,
        })),
    };
}
