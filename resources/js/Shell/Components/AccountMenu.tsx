import { Link, usePage } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { LogOut, Settings, Shield } from 'lucide-react';
import { useState } from 'react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { logout } from '@/routes';
import * as admin from '@/routes/admin';
import * as settings from '@/routes/settings';
import PersonAvatar from '@/Shell/Components/PersonAvatar';
import { isRouteActive } from '@/Shell/Components/shell-nav';
import type { Auth } from '@/types/auth';

type SharedProps = { auth: Auth };

const GUEST = { name: '?', avatar_url: null };

export default function AccountMenu() {
    const { props, url } = usePage<SharedProps>();
    const user = props.auth.user;
    const isAdmin = user?.roles?.includes('admin') ?? false;
    const [open, setOpen] = useState(false);

    // The layout persists across visits, so a menu left open would outlive the page it was on.
    const [seenUrl, setSeenUrl] = useState(url);

    if (url !== seenUrl) {
        setSeenUrl(url);
        setOpen(false);
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                aria-label="Account menu"
                className="shell-focus shell-account-trigger flex items-center justify-center"
            >
                <PersonAvatar person={user ?? GUEST} size={32} />
            </PopoverTrigger>
            <PopoverContent
                align="end"
                sideOffset={8}
                collisionPadding={8}
                className="max-h-(--available-height) w-64 overflow-y-auto border-(--border) bg-(--card) p-1 text-(--foreground)"
            >
                {user && (
                    <div className="shell-account-header flex items-center gap-3">
                        <PersonAvatar person={user} size={44} />
                        <div className="min-w-0">
                            <div className="shell-account-name truncate">
                                {user.name}
                            </div>
                            <div className="shell-account-email truncate">
                                {user.email}
                            </div>
                        </div>
                    </div>
                )}
                <Separator className="my-1" />
                <nav aria-label="Account">
                    <MenuLink
                        href={settings.index.url()}
                        label="Settings"
                        icon={Settings}
                        url={url}
                        onNavigate={() => setOpen(false)}
                    />
                    {isAdmin && (
                        <MenuLink
                            href={admin.index.url()}
                            label="Admin settings"
                            icon={Shield}
                            url={url}
                            onNavigate={() => setOpen(false)}
                        />
                    )}
                </nav>
                <Separator className="my-1" />
                <Link
                    href={logout.url()}
                    method="post"
                    as="button"
                    className="shell-focus shell-account-signout flex w-full items-center gap-3 rounded-md px-3 text-left"
                >
                    <LogOut size={18} strokeWidth={1.5} aria-hidden="true" />
                    Sign out
                </Link>
            </PopoverContent>
        </Popover>
    );
}

function MenuLink({
    href,
    label,
    icon: Icon,
    url,
    onNavigate,
}: {
    href: string;
    label: string;
    icon: LucideIcon;
    url: string;
    onNavigate: () => void;
}) {
    return (
        <Link
            href={href}
            onClick={onNavigate}
            aria-current={isRouteActive(url, href) ? 'page' : undefined}
            className="shell-focus shell-account-item flex items-center gap-3 rounded-md px-3"
        >
            <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
            {label}
        </Link>
    );
}
