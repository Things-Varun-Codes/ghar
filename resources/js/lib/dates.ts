/*
 * The household's region, from the shared `region` prop (GHAR_TIMEZONE / GHAR_LOCALE): one
 * locale for every device in the house, so a date reads the same everywhere. app.tsx sets it
 * from the first page; until then dates read en-GB.
 */
export type Region = {
    timezone: string;
    locale: string;
    /* 0 for Sunday through 6 for Saturday. */
    week_start: number;
};

let current: Region = { timezone: 'UTC', locale: 'en-GB', week_start: 1 };

export function setRegion(region: Region | null | undefined): void {
    if (region) {
        current = region;
    }
}

export function region(): Region {
    return current;
}

/* The day a calendar week begins on, as Date.getDay() counts. */
export function weekStart(): number {
    return current.week_start;
}

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

    return date.toLocaleDateString(
        current.locale,
        options?.intl ?? DEFAULT_DATE,
    );
}
