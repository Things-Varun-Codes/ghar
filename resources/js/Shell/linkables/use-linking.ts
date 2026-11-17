import { usePage } from '@inertiajs/react';

/* LinkableEntities::forPage(): the types a link may point at now, and whether any can be searched. */
export type Linking = {
    types: string[];
    searchable: boolean;
};

const NONE: Linking = { types: [], searchable: false };

export function useLinking(): Linking {
    return usePage().props.linking ?? NONE;
}

/* A link to a type that isn't listed (its room is off) is drawn as plain text. */
export function useLinkTypeOn(type: string | null): boolean {
    const { types } = useLinking();

    return type !== null && types.includes(type);
}
