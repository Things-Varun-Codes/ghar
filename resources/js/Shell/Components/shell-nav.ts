import type { LucideIcon } from 'lucide-react';
import {
    Bell,
    DoorOpen,
    KeyRound,
    Link2,
    Send,
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
    { href: rooms.index.url(), label: 'Rooms', icon: DoorOpen },
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
    const u = pathOf(url);
    const r = pathOf(route);

    return u === r || (r !== '/' && u.startsWith(r + '/'));
}
