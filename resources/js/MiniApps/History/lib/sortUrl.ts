export function buildSortHref(
    targetOrder: 'newest-first' | 'oldest-first',
    basePath: string,
    extraParams: Record<string, string | number> = {},
): string {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(extraParams)) {
        params.set(key, String(value));
    }

    if (targetOrder === 'oldest-first') {
        params.set('order', 'oldest-first');
    }

    const qs = params.toString();

    return qs ? `${basePath}?${qs}` : basePath;
}
