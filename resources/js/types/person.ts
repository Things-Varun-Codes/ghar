/*
 * Someone named on a page: App\Shell\Support\Person on the server. `avatar_url` is a signed
 * URL that stays the same for an hour, or null when they have no picture.
 */
export type Person = {
    id: number;
    name: string;
    avatar_url: string | null;
    /* Removed from the household: still named on what they made, never offered in a picker. */
    former?: true;
};
