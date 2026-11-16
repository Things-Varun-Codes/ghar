import { formatDate } from '@/lib/dates';

/* Parsed as numeric parts so a plain date never shifts a day across timezones. */
export function formatPlainDay(
    iso: string | null | undefined,
    fallback = '—',
): string {
    if (!iso) {
        return fallback;
    }

    const [y, m, d] = iso.slice(0, 10).split('-').map(Number);

    if (!y || !m || !d || m < 1 || m > 12) {
        return fallback;
    }

    return formatDate(new Date(y, m - 1, d), { fallback });
}

export function formatInstantDay(
    iso: string | null | undefined,
    fallback = '—',
): string {
    return formatDate(iso, { fallback });
}
