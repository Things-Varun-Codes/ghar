/*
 * The household's region, from the shared `region` prop (GHAR_TIMEZONE / GHAR_LOCALE / GHAR_CURRENCY): one
 * locale and one clock for every device in the house, so a date reads the same everywhere.
 * app.tsx sets it from the first page; until then dates read en-GB in UTC.
 */
export type Region = {
    timezone: string;
    locale: string;
    /* 0 for Sunday through 6 for Saturday. */
    week_start: number;
    /* ISO 4217, for Intl: 'INR'. */
    currency: string;
};

let current: Region = {
    timezone: 'UTC',
    locale: 'en-GB',
    week_start: 1,
    currency: 'INR',
};

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

type FormatOptions = {
    intl?: Intl.DateTimeFormatOptions;
    fallback?: string;
};

/*
 * A moment in time (an ISO timestamp: a login, an expiry, a comment), read on the household's
 * clock, so 23:30 UTC is already tomorrow in Asia/Kolkata on every device.
 */
export function formatInstant(
    value: string | Date | null | undefined,
    options?: FormatOptions,
): string {
    const fallback = options?.fallback ?? '';

    if (!value) {
        return fallback;
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
        return fallback;
    }

    return date.toLocaleDateString(current.locale, {
        ...(options?.intl ?? DEFAULT_DATE),
        timeZone: current.timezone,
    });
}

/*
 * A calendar date with no time ("YYYY-MM-DD": when a moment happened, a birthday, a due date).
 * Read as its parts and formatted without a timezone, so no clock can move it to another day.
 */
export function formatPlainDate(
    value: string | null | undefined,
    options?: FormatOptions,
): string {
    const fallback = options?.fallback ?? '';
    const date = value ? plainDate(value) : null;

    if (!date) {
        return fallback;
    }

    return date.toLocaleDateString(
        current.locale,
        options?.intl ?? DEFAULT_DATE,
    );
}

function plainDate(value: string): Date | null {
    const [y, m, d] = value.slice(0, 10).split('-').map(Number);

    if (!y || !m || !d || m < 1 || m > 12 || d > 31) {
        return null;
    }

    return new Date(y, m - 1, d);
}

/* January first, in the household's locale. */
export function monthNames(style: 'long' | 'short'): string[] {
    const format = new Intl.DateTimeFormat(current.locale, {
        month: style,
        timeZone: 'UTC',
    });

    return Array.from({ length: 12 }, (_, i) =>
        format.format(Date.UTC(2024, i, 1)),
    );
}

/* Sunday first, as Date.getDay() counts, in the household's locale. */
export function weekdayNames(style: 'long' | 'narrow'): string[] {
    const format = new Intl.DateTimeFormat(current.locale, {
        weekday: style,
        timeZone: 'UTC',
    });

    // 7 January 2024 was a Sunday.
    return Array.from({ length: 7 }, (_, i) =>
        format.format(Date.UTC(2024, 0, 7 + i)),
    );
}

/* "5 November" (en-GB) or "November 5" (en-US): a day of the year, with no year. */
export function formatDayMonth(month: number, day: number): string {
    // 2024 is a leap year, so 29 February has a day to land on.
    return new Intl.DateTimeFormat(current.locale, {
        day: 'numeric',
        month: 'long',
        timeZone: 'UTC',
    }).format(Date.UTC(2024, month - 1, day));
}
