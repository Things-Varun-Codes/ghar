import { hasParam } from '@/lib/url';

/* `?moment={id}` names the moment whose sheet is open (RequestedMoment.php on the server). */
export const MOMENT_PARAM = 'moment';

export function momentIdFromUrl(url: string): number | null {
    const raw = new URL(url, 'http://ghar.invalid').searchParams.get(
        MOMENT_PARAM,
    );

    return raw !== null && /^\d+$/.test(raw) ? Number(raw) : null;
}

export function hasMomentParam(url: string): boolean {
    return hasParam(url, MOMENT_PARAM);
}
