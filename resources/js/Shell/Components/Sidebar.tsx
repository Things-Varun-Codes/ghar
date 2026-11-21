import { Link, usePage } from '@inertiajs/react';
import {
    ChevronDown,
    ChevronRight,
    Home,
    LayoutGrid,
    Settings,
    Shield,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { dashboard } from '@/routes';
import AppMark from '@/Shell/Components/AppMark';
import { navIconFor, navIcons } from '@/Shell/Components/bottom-bar';
import type { ShellNavItem } from '@/Shell/Components/shell-nav';
import {
    ADMIN_ITEMS,
    SETTINGS_ITEMS,
    isRouteActive,
} from '@/Shell/Components/shell-nav';
import type { Auth } from '@/types/auth';
import type { MiniApp } from '@/types/miniapp';

type SharedProps = {
    auth: Auth;
    name: string;
    miniApps?: MiniApp[];
    version?: { label: string; url: string | null } | null;
};

export default function Sidebar() {
    const { props, url } = usePage<SharedProps>();
    const user = props.auth.user;
    const isAdmin = user?.roles?.includes('admin') ?? false;

    const settingsHasActive = SETTINGS_ITEMS.some((i) =>
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
                        aria-label={`${props.name}, go to Home`}
                        className="shell-focus inline-flex min-h-11 items-center rounded-full"
                    >
                        <div className="shell-wordmark-sidebar">
                            <AppMark />
                            {props.name}
                        </div>
                    </Link>
                </div>
            </div>

            <ul className="flex-1 space-y-0.5 px-3">
                <NavItem
                    href={dashboard.url()}
                    icon={<Home size={18} strokeWidth={1.5} />}
                    label="Home"
                    active={isRouteActive(url, dashboard.url())}
                />

                {/* The same rooms as the phone's bottom bar, so a laptop reaches them in one click. */}
                {(props.miniApps ?? []).map((app) => {
                    const Icon = navIconFor(app, navIcons) ?? LayoutGrid;

                    return (
                        <NavItem
                            key={app.slug}
                            href={app.route}
                            icon={<Icon size={18} strokeWidth={1.5} />}
                            label={app.name}
                            active={
                                url === app.route ||
                                url.startsWith(`${app.route}/`) ||
                                url.startsWith(`${app.route}?`)
                            }
                        />
                    );
                })}

                <li role="presentation" className="h-[12px]" />

                {isAdmin && (
                    <li role="presentation">
                        <div className="shell-nav-section-label">Manage</div>
                    </li>
                )}

                {/*
                 * No heading role: a level-3 heading with no h1/h2 ancestor is an invalid jump for
                 * screen readers.
                 */}
                <NavGroup
                    label="Settings"
                    icon={<Settings size={18} strokeWidth={1.5} />}
                    open={settingsHasActive}
                    items={SETTINGS_ITEMS}
                    url={url}
                />

                {isAdmin && (
                    <NavGroup
                        label="Admin"
                        icon={<Shield size={18} strokeWidth={1.5} />}
                        open={adminHasActive}
                        items={ADMIN_ITEMS}
                        url={url}
                    />
                )}
            </ul>

            {props.version && (
                <p className="shell-sidebar-version px-6 pt-4 pb-5">
                    {props.name}{' '}
                    {props.version.url ? (
                        <a
                            href={props.version.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shell-focus shell-sidebar-version-link"
                            aria-label={`${props.version.label} on GitHub (opens in a new tab)`}
                        >
                            {props.version.label}
                        </a>
                    ) : (
                        props.version.label
                    )}
                </p>
            )}
        </nav>
    );
}

function NavGroup({
    label,
    icon,
    open: hasActiveChild,
    items,
    url,
}: {
    label: string;
    icon: ReactNode;
    open: boolean;
    items: ShellNavItem[];
    url: string;
}) {
    const [open, setOpen] = useState(hasActiveChild);

    const [seenUrl, setSeenUrl] = useState(url);

    if (url !== seenUrl) {
        setSeenUrl(url);

        if (hasActiveChild) {
            setOpen(true);
        }
    }

    const Chevron = open ? ChevronDown : ChevronRight;

    return (
        <Collapsible render={<li />} open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger className="shell-focus shell-nav-item shell-nav-group-toggle flex w-full items-center gap-3 px-3">
                <span aria-hidden="true">{icon}</span>
                <span className="flex-1 text-left">{label}</span>
                <Chevron size={16} strokeWidth={1.5} aria-hidden="true" />
            </CollapsibleTrigger>
            <CollapsibleContent render={<ul />} className="space-y-0.5">
                {items.map((item) => (
                    <SubNavItem
                        key={item.href}
                        href={item.href}
                        label={item.label}
                        active={isRouteActive(url, item.href)}
                    />
                ))}
            </CollapsibleContent>
        </Collapsible>
    );
}

function NavItem({
    href,
    icon,
    label,
    active,
}: {
    href: string;
    icon: ReactNode;
    label: string;
    active: boolean;
}) {
    return (
        <li>
            <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className="shell-focus shell-nav-item flex items-center gap-3 px-3"
            >
                <span aria-hidden="true">{icon}</span>
                <span>{label}</span>
            </Link>
        </li>
    );
}

function SubNavItem({
    href,
    label,
    active,
}: {
    href: string;
    label: string;
    active: boolean;
}) {
    return (
        <li>
            <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className="shell-focus shell-nav-subitem flex items-center"
            >
                {label}
            </Link>
        </li>
    );
}
