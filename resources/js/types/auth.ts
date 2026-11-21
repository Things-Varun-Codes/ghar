import type { Person } from '@/types/person';

/*
 * Shared auth types. Must match HandleInertiaRequests::share()['auth'].
 * roles is the canonical admin predicate via auth.user.roles.includes('admin').
 * Keep these in sync if that contract changes.
 */
export type Theme = 'system' | 'light' | 'dark';

export type User = Person & {
    email: string;
    roles: string[];
    theme: Theme;
};

export type Auth = {
    user: User | null;
};
