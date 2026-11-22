import type { LucideIcon } from 'lucide-react';
import {
    Bell,
    DoorOpen,
    KeyRound,
    Link2,
    Send,
    ShieldCheck,
    SunMoon,
    UserPlus,
    UserRound,
    Users,
} from 'lucide-react';
import { pathOf } from '@/lib/url';
import * as invites from '@/routes/admin/invites';
import * as adminNotifications from '@/routes/admin/notifications';
import * as rooms from '@/routes/admin/rooms';
import * as shortlinks from '@/routes/admin/shortlinks';
import * as users from '@/routes/admin/users';
import * as appearance from '@/routes/settings/appearance';
import * as notifications from '@/routes/settings/notifications';
import * as password from '@/routes/settings/password';
import * as profile from '@/routes/settings/profile';
import * as security from '@/routes/settings/security';

export type ShellNavItem = {
    href: string;
    label: string;
    icon: LucideIcon;
    /** What the page holds, under its name on the Settings and Admin lists. */
    hint: string;
};

// The OS pages, shared by the desktop sidebar and the Settings and Admin lists.
export const SETTINGS_ITEMS: ShellNavItem[] = [
    {
        href: profile.show.url(),
        label: 'Profile',
        icon: UserRound,
        hint: 'Your name, email and picture',
    },
    {
        href: password.show.url(),
        label: 'Password',
        icon: KeyRound,
        hint: 'Change the password you sign in with',
    },
    {
        href: security.show.url(),
        label: 'Two-step sign-in',
        icon: ShieldCheck,
        hint: 'A code from your phone as well as your password',
    },
    {
        href: notifications.show.url(),
        label: 'Notifications',
        icon: Bell,
        hint: 'What this device alerts you about',
    },
    {
        href: appearance.show.url(),
        label: 'Appearance',
        icon: SunMoon,
        hint: 'Light, dark or the same as this device',
    },
];

export const ADMIN_ITEMS: ShellNavItem[] = [
    {
        href: rooms.index.url(),
        label: 'Rooms',
        icon: DoorOpen,
        hint: 'Which rooms this home has',
    },
    {
        href: invites.index.url(),
        label: 'Invites',
        icon: UserPlus,
        hint: 'Ask someone to join',
    },
    {
        href: users.index.url(),
        label: 'Users',
        icon: Users,
        hint: 'Everyone in the household and their roles',
    },
    {
        href: adminNotifications.show.url(),
        label: 'Send notification',
        icon: Send,
        hint: 'A push or an email to one person',
    },
    {
        href: shortlinks.index.url(),
        label: 'Shortlinks',
        icon: Link2,
        hint: 'Short addresses that open a page',
    },
];

/** `url` is Inertia's page url (path plus query). */
export function isRouteActive(url: string, route: string): boolean {
    const u = pathOf(url);
    const r = pathOf(route);

    return u === r || (r !== '/' && u.startsWith(r + '/'));
}
