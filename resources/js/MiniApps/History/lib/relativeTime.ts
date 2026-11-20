import { formatInstant, region } from '@/lib/dates';

/* "now", "5 min ago", "3 hr ago", "12 days ago" (en-GB), then the date. */
export function relativeTime(
    isoDate: string,
    now: number = Date.now(),
): string {
    const seconds = Math.floor((now - new Date(isoDate).getTime()) / 1000);
    const locale = region().locale;

    if (seconds < 60) {
        return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(
            0,
            'second',
        );
    }

    // Always a number: "yesterday" would claim a calendar day that 30 hours ago may not be.
    const ago = new Intl.RelativeTimeFormat(locale, { style: 'narrow' });
    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) {
        return ago.format(-minutes, 'minute');
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        return ago.format(-hours, 'hour');
    }

    const days = Math.floor(hours / 24);

    if (days < 30) {
        return ago.format(-days, 'day');
    }

    return formatInstant(isoDate);
}
