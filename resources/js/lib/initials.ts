/*
 * Up to two letters for someone without a picture: "Meera Rao" → "MR". At the smallest avatar
 * sizes only the first fits at a readable 13px.
 */
export function initials(name: string, letters: 1 | 2 = 2): string {
    // A word that starts with no letter isn't part of the name: "Nisha (deleted)" is "N".
    const parts = name
        .trim()
        .split(/\s+/)
        .filter((part) => /^\p{L}/u.test(part))
        .slice(0, letters);

    return parts.map((part) => part.charAt(0).toUpperCase()).join('') || '?';
}
