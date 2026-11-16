// Inertia's page url is path + query (+ hash); any origin will do to parse it.
const BASE = 'http://ghar.invalid';

/** The path without query, hash or trailing slash; the root is `/`. */
export function pathOf(url: string): string {
    return new URL(url, BASE).pathname.replace(/\/$/, '') || '/';
}

export function withParam(url: string, name: string, value: string): string {
    const u = new URL(url, BASE);
    u.searchParams.set(name, value);

    return u.pathname + u.search + u.hash;
}

export function withoutParam(url: string, name: string | null): string {
    const u = new URL(url, BASE);

    if (name !== null) {
        u.searchParams.delete(name);
    }

    return u.pathname + u.search + u.hash;
}

export function hasParam(url: string, name: string): boolean {
    return new URL(url, BASE).searchParams.has(name);
}
