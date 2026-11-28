import { region } from '@/lib/dates';

/* Expense::MAX_AMOUNT on the server, in minor units. */
export const MAX_AMOUNT = 99_999_999_999;

function currencyFormat(): Intl.NumberFormat {
    return new Intl.NumberFormat(region().locale, {
        style: 'currency',
        currency: region().currency,
    });
}

/* How many minor-unit digits the household's currency has: 2 for INR, 0 for JPY, 3 for KWD. */
export function fractionDigits(): number {
    return currencyFormat().resolvedOptions().maximumFractionDigits ?? 2;
}

/* Minor units as the household reads money: 240000 is "₹2,400.00". */
export function formatMoney(minor: number): string {
    // Exact: MAX_AMOUNT is far inside what a double holds, and Intl rounds to the currency's digits.
    return currencyFormat().format(minor / 10 ** fractionDigits());
}

/*
 * The household's currency mark, for the front of an amount field.
 *
 * shortcut: always drawn before the figure; read its side from Intl if a household whose
 * currency follows the number turns up.
 */
export function currencySymbol(): string {
    return (
        currencyFormat()
            .formatToParts(0)
            .find((part) => part.type === 'currency')?.value ?? ''
    );
}

/* Minor units as plain text for an amount field: 240050 is "2400.50", 240000 is "2400". */
export function moneyInput(minor: number): string {
    const digits = fractionDigits();
    const text = String(minor).padStart(digits + 1, '0');
    const whole = text.slice(0, text.length - digits);
    const fraction = text.slice(text.length - digits);

    return /^0*$/.test(fraction) ? whole : `${whole}.${fraction}`;
}

/*
 * Typed text to minor units, by moving the decimal point in the string: no float ever holds
 * the amount. Null for anything that isn't a plain amount the currency can hold.
 *
 * shortcut: a comma is a thousands separator and a dot the decimal point, whatever the locale;
 * read the separators from Intl if a household that writes "12,50" turns up.
 */
export function parseMoney(text: string): number | null {
    const match = /^(\d*)(?:\.(\d*))?$/.exec(text.replace(/[\s,]/g, ''));

    if (!match || (match[1] === '' && !match[2])) {
        return null;
    }

    const digits = fractionDigits();
    const fraction = match[2] ?? '';

    if (fraction.length > digits) {
        return null;
    }

    const minor = (match[1] + fraction.padEnd(digits, '0')).replace(
        /^0+(?=\d)/,
        '',
    );

    if (
        minor.length > String(MAX_AMOUNT).length ||
        Number(minor) > MAX_AMOUNT
    ) {
        return null;
    }

    return Number(minor);
}

/*
 * What an exact split still has to hand out, in minor units: negative when the shares run
 * over. Null until the total is known; a blank or unreadable share counts as nothing.
 */
export function leftToAssign(
    total: number | null,
    shares: (number | null)[],
): number | null {
    return total === null
        ? null
        : shares.reduce<number>((left, share) => left - (share ?? 0), total);
}
