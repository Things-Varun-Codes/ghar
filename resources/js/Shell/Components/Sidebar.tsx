import { Link, usePage } from '@inertiajs/react';
import { ChevronDown, ChevronRight, Home } from 'lucide-react';
import { useId, useState } from 'react';
import { dashboard } from '@/routes';
import * as invites from '@/routes/admin/invites';
import * as adminNotifications from '@/routes/admin/notifications';
import * as shortlinks from '@/routes/admin/shortlinks';
import * as theme from '@/routes/admin/theme';
import * as users from '@/routes/admin/users';
import * as notifications from '@/routes/settings/notifications';
import * as password from '@/routes/settings/password';
import * as profile from '@/routes/settings/profile';
import HeartMark from '@/Shell/Components/HeartMark';

type SharedProps = {
    version: { label: string; url: string | null } | null;
    auth: { user: { name: string; email: string; roles: string[] } | null };
};

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
    const { props, url } = usePage<SharedProps>();
    const user = props.auth.user;
    const version = props.version;
    const isAdmin = user?.roles?.includes('admin') ?? false;

    const settingsItems: GroupItem[] = [
        { href: profile.show.url(), label: 'Profile' },
        { href: password.show.url(), label: 'Password' },
        { href: notifications.show.url(), label: 'Notifications' },
    ];
    const settingsHasActive = settingsItems.some((i) =>
        isRouteActive(url, i.href),
    );
    const adminHasActive = ADMIN_ITEMS.some((i) => isRouteActive(url, i.href));

    return (
        <nav
            className="flex h-full w-full flex-col bg-(--sidebar) text-(--foreground)"
            aria-label="Main navigation"
        >
            <div className="px-6 pt-6 pb-4">
                <div className="flex items-center gap-1">
                    <Link
                        href={dashboard().url}
                        aria-label="Go to dashboard"
                        className="block cursor-pointer transition-opacity hover:opacity-85"
                    >
                        <div className="shell-wordmark-sidebar">
                            {props.name}
                            <HeartMark size={15} filled />
                        </div>
                    </Link>
                </div>
            </div>

            <ul className="flex-1 space-y-0.5 px-3">
                <NavItem
                    href={dashboard.url()}
                    icon={<Home size={18} />}
                    label="Home"
                    active={url === dashboard.url() || url === '/'}
                    onNavigate={onNavigate}
                />

                <li role="presentation" className="h-[12px]" />

                <li role="presentation">
                    <div className="shell-nav-section-label">Manage</div>
                </li>

                {/*
                 * No heading role: a level-3 heading with no h1/h2 ancestor is an invalid jump for
                 * screen readers.
                 */}
                <NavGroup
                    label="Settings"
                    open={settingsHasActive}
                    onNavigate={onNavigate}
                    items={settingsItems}
                    url={url}
                />

                {isAdmin && (
                    <NavGroup
                        label="Admin"
                        open={adminHasActive}
                        onNavigate={onNavigate}
                        items={ADMIN_ITEMS}
                        url={url}
                    />
                )}
            </ul>

            {version && (
                <div className="px-6 pt-4 pb-5">
                    <p className="shell-sidebar-version">
                        {props.name}{' '}
                        {version.url ? (
                            <a
                                href={version.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shell-focus shell-sidebar-version-link"
                                aria-label={`${version.label} on GitHub (opens in a new tab)`}
                            >
                                {version.label}
                            </a>
                        ) : (
                            version.label
                        )}
                    </p>
                </div>
            )}
        </nav>
    );
}

type GroupItem = { href: string; label: string };

const ADMIN_ITEMS: GroupItem[] = [
    { href: invites.index.url(), label: 'Invites' },
    { href: users.index.url(), label: 'Users' },
    { href: theme.index.url(), label: 'Theme' },
    { href: adminNotifications.show.url(), label: 'Send notification' },
    { href: shortlinks.index.url(), label: 'Shortlinks' },
];

function isRouteActive(url: string, route: string): boolean {
    const u = url.replace(/\/$/, '');
    const r = route.replace(/\/$/, '');

    if (r === '') {
        return u === '';
    }

    return u === r || u.startsWith(r + '/');
}

function NavGroup({
    label,
    open: hasActiveChild,
    items,
    url,
    onNavigate,
}: {
    label: string;
    open: boolean;
    items: GroupItem[];
    url: string;
    onNavigate?: () => void;
}) {
    const [open, setOpen] = useState(hasActiveChild);
    const listId = useId();

    const [seenUrl, setSeenUrl] = useState(url);

    if (url !== seenUrl) {
        setSeenUrl(url);

        if (hasActiveChild) {
            setOpen(true);
        }
    }

    const Chevron = open ? ChevronDown : ChevronRight;

    return (
        <li>
            <button
                type="button"
                className="shell-focus shell-nav-group-toggle flex w-full items-center justify-between rounded-lg transition-colors"
                aria-expanded={open}
                aria-controls={listId}
                onClick={() => setOpen((prev) => !prev)}
            >
                <span>{label}</span>
                <Chevron size={14} aria-hidden="true" />
            </button>
            <ul id={listId} hidden={!open} className="space-y-0.5">
                {items.map((item) => (
                    <SubNavItem
                        key={item.href}
                        href={item.href}
                        label={item.label}
                        active={isRouteActive(url, item.href)}
                        onNavigate={onNavigate}
                    />
                ))}
            </ul>
        </li>
    );
}

function NavItem({
    href,
    icon,
    label,
    active,
    onNavigate,
}: {
    href: string;
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onNavigate?: () => void;
}) {
    return (
        <li>
            <Link
                href={href}
                onClick={onNavigate}
                className="shell-focus shell-nav-item flex items-center gap-3 px-3 transition-colors"
                style={{
                    color: active
                        ? 'var(--sidebar-primary-foreground)'
                        : 'color-mix(in oklab, var(--foreground) 74%, transparent)',
                    backgroundColor: active
                        ? 'var(--sidebar-primary)'
                        : 'transparent',
                }}
            >
                <span className="text-inherit">{icon}</span>
                <span>{label}</span>
            </Link>
        </li>
    );
}

function SubNavItem({
    href,
    label,
    active,
    onNavigate,
}: {
    href: string;
    label: string;
    active: boolean;
    onNavigate?: () => void;
}) {
    return (
        <li>
            <Link
                href={href}
                onClick={onNavigate}
                className="shell-focus shell-nav-subitem flex items-center transition-colors"
                style={{
                    fontWeight: active ? 500 : 400,
                    color: active
                        ? 'var(--sidebar-primary-foreground)'
                        : 'color-mix(in oklab, var(--foreground) 74%, transparent)',
                    backgroundColor: active
                        ? 'var(--sidebar-primary)'
                        : 'transparent',
                }}
            >
                {label}
            </Link>
        </li>
    );
}
