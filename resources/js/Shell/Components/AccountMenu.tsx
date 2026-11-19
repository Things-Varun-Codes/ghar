import { Link, usePage } from '@inertiajs/react';
import { LogOut } from 'lucide-react';
import { useId, useState } from 'react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { logout } from '@/routes';
import PersonAvatar from '@/Shell/Components/PersonAvatar';
import type { ShellNavItem } from '@/Shell/Components/shell-nav';
import {
    ADMIN_ITEMS,
    SETTINGS_ITEMS,
    isRouteActive,
} from '@/Shell/Components/shell-nav';
import type { Auth } from '@/types/auth';

type SharedProps = { auth: Auth };

const GUEST = { name: '?', avatar_url: null };

/**
 * `withNav` is the phone menu: below `lg` there is no sidebar, so Settings and Admin live here.
 */
export default function AccountMenu({
    withNav = false,
}: {
    withNav?: boolean;
}) {
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
                className={`${withNav ? 'w-64' : 'w-56'} max-h-(--available-height) overflow-y-auto border-(--border) bg-(--card) p-1 text-(--foreground)`}
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
                {withNav && (
                    <nav aria-label="Account">
                        <MenuGroup
                            label="Settings"
                            items={SETTINGS_ITEMS}
                            url={url}
                            onNavigate={() => setOpen(false)}
                        />
                        {isAdmin && (
                            <MenuGroup
                                label="Admin"
                                items={ADMIN_ITEMS}
                                url={url}
                                onNavigate={() => setOpen(false)}
                            />
                        )}
                    </nav>
                )}
                <Separator className="my-1" />
                <Link
                    href={logout.url()}
                    method="post"
                    as="button"
                    className="shell-focus shell-account-signout flex w-full items-center gap-3 rounded-md px-3 text-left"
                >
                    {withNav && (
                        <LogOut
                            size={18}
                            strokeWidth={1.5}
                            aria-hidden="true"
                        />
                    )}
                    Sign out
                </Link>
            </PopoverContent>
        </Popover>
    );
}

function MenuGroup({
    label,
    items,
    url,
    onNavigate,
}: {
    label: string;
    items: ShellNavItem[];
    url: string;
    onNavigate: () => void;
}) {
    const id = useId();

    return (
        <div className="pb-1">
            <Separator className="mb-1" />
            <p id={id} className="shell-account-group-label">
                {label}
            </p>
            <ul aria-labelledby={id}>
                {items.map(({ href, label: itemLabel, icon: Icon }) => {
                    const active = isRouteActive(url, href);

                    return (
                        <li key={href}>
                            <Link
                                href={href}
                                onClick={onNavigate}
                                aria-current={active ? 'page' : undefined}
                                className="shell-focus shell-account-item flex items-center gap-3 rounded-md px-3"
                            >
                                <Icon
                                    size={18}
                                    strokeWidth={1.5}
                                    aria-hidden="true"
                                />
                                {itemLabel}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
