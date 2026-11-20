import { region } from '@/lib/dates';

/* "YYYY-MM-DD" of an instant on the household's clock. en-CA formats dates in that order. */
export function dayKey(iso: string): string {
    return new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: region().timezone,
    }).format(new Date(iso));
}

/* Something from the last day reads a step stronger than the rest of the week. */
export function freshnessWeight(at: string, now: Date = new Date()): number {
    return now.getTime() - new Date(at).getTime() < 86_400_000 ? 600 : 400;
}

/* "now", "12m", "3h", "2d": a tight readout for the right-hand column. */
export function shortAgo(iso: string, now: Date = new Date()): string {
    const minutes = Math.max(
        0,
        Math.round((now.getTime() - new Date(iso).getTime()) / 60_000),
    );

    if (minutes < 1) {
        return 'now';
    }

    if (minutes < 60) {
        return `${minutes}m`;
    }

    if (minutes < 60 * 24) {
        return `${Math.round(minutes / 60)}h`;
    }

    return `${Math.round(minutes / (60 * 24))}d`;
}
