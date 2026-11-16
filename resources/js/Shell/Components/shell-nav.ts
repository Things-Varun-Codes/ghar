import type { LucideIcon } from 'lucide-react';
import {
    Bell,
    KeyRound,
    Link2,
    Send,
    UserPlus,
    UserRound,
    Users,
} from 'lucide-react';
import * as invites from '@/routes/admin/invites';
import * as adminNotifications from '@/routes/admin/notifications';
import * as shortlinks from '@/routes/admin/shortlinks';
import * as users from '@/routes/admin/users';
import * as notifications from '@/routes/settings/notifications';
import * as password from '@/routes/settings/password';
import * as profile from '@/routes/settings/profile';

export type ShellNavItem = { href: string; label: string; icon: LucideIcon };

// The OS pages, shared by the desktop sidebar and the phone account menu.
export const SETTINGS_ITEMS: ShellNavItem[] = [
    { href: profile.show.url(), label: 'Profile', icon: UserRound },
    { href: password.show.url(), label: 'Password', icon: KeyRound },
    { href: notifications.show.url(), label: 'Notifications', icon: Bell },
];

export const ADMIN_ITEMS: ShellNavItem[] = [
    { href: invites.index.url(), label: 'Invites', icon: UserPlus },
    { href: users.index.url(), label: 'Users', icon: Users },
    {
        href: adminNotifications.show.url(),
        label: 'Send notification',
        icon: Send,
    },
    { href: shortlinks.index.url(), label: 'Shortlinks', icon: Link2 },
];

/** `url` is Inertia's page url (path plus query). */
export function isRouteActive(url: string, route: string): boolean {
    const u = url.split('?')[0].replace(/\/$/, '');
    const r = route.replace(/\/$/, '');

    if (r === '') {
        return u === '';
    }

    return u === r || u.startsWith(r + '/');
}
