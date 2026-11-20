import { formatInstant, formatPlainDate } from '@/lib/dates';

export function formatPlainDay(
    iso: string | null | undefined,
    fallback = '—',
): string {
    return formatPlainDate(iso, { fallback });
}

export function formatInstantDay(
    iso: string | null | undefined,
    fallback = '—',
): string {
    return formatInstant(iso, { fallback });
}
