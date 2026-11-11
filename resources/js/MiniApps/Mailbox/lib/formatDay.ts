/* One hard-coded month list: Intl en-GB renders September as Sept on newer ICU builds. */

const MONTHS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
];

function render(year: number, month: number, day: number): string {
    return `${String(day).padStart(2, '0')} ${MONTHS[month - 1]} ${year}`;
}

/* Parsed as numeric parts so the day never shifts across timezones. */
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

    return render(y, m, d);
}

export function formatInstantDay(
    iso: string | null | undefined,
    fallback = '—',
): string {
    if (!iso) {
        return fallback;
    }

    const date = new Date(iso);

    if (Number.isNaN(date.getTime())) {
        return fallback;
    }

    return render(date.getFullYear(), date.getMonth() + 1, date.getDate());
}
