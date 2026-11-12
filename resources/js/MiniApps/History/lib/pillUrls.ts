/*
 * The pill's href and thumbnail arrive as free-text data attributes, which the
 * server's sanitiser doesn't check as URLs. These are that check.
 */

function parse(value: string, origin: string): URL | null {
    try {
        return new URL(value, origin);
        // eslint-disable-next-line local/no-silent-error -- an unparseable value is simply not a usable URL.
    } catch {
        return null;
    }
}

/*
 * Corner links are absolute URLs from route(), so same-origin http(s) passes as
 * well as a root-relative path. Parsing first matters: browsers read "/\host"
 * as "//host", which a prefix test lets through.
 */
export function internalHref(
    href: string,
    origin: string = window.location.origin,
): string | null {
    if (!href) {
        return null;
    }

    const url = parse(href, origin);

    if (
        url === null ||
        url.origin !== origin ||
        (url.protocol !== 'http:' && url.protocol !== 'https:')
    ) {
        return null;
    }

    return url.href;
}

export function thumbnailSrc(
    src: string,
    origin: string = window.location.origin,
): string | null {
    if (!src) {
        return null;
    }

    const url = parse(src, origin);

    if (url === null) {
        return null;
    }

    if (url.protocol === 'https:' || url.origin === origin) {
        return url.href;
    }

    return null;
}
