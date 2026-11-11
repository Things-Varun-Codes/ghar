export function monogram(...names: string[]): string {
    return names
        .map((name) => name.trim().charAt(0).toUpperCase())
        .filter(Boolean)
        .join('&');
}
