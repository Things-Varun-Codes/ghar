import type { Person } from '@/types/person';

/*
 * Shared auth types. Must match HandleInertiaRequests::share()['auth'].
 * roles is the canonical admin predicate via auth.user.roles.includes('admin').
 * Keep these in sync if that contract changes.
 */
export type User = Person & {
    email: string;
    roles: string[];
};

export type Auth = {
    user: User | null;
};
