// One fixed locale, so a date reads the same on every device in the house.
export const APP_LOCALE = 'en-GB';

const DEFAULT_DATE: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
};

export function formatDate(
    value: string | Date | null | undefined,
    options?: {
        intl?: Intl.DateTimeFormatOptions;
        fallback?: string;
    },
): string {
    const fallback = options?.fallback ?? '';

    if (!value) {
        return fallback;
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
        return fallback;
    }

    return date.toLocaleDateString(APP_LOCALE, options?.intl ?? DEFAULT_DATE);
}
