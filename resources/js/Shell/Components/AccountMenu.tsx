import { Link, usePage } from '@inertiajs/react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { logout } from '@/routes';

type SharedProps = {
    auth: { user: { name: string; email: string; roles: string[] } | null };
};

function initials(name: string): string {
    const parts = name.trim().split(/\s+/).slice(0, 2);

    return parts.map((p) => p.charAt(0).toUpperCase()).join('') || '?';
}

export default function AccountMenu() {
    const { props } = usePage<SharedProps>();
    const user = props.auth.user;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    aria-label="Account menu"
                    className="shell-focus shell-account-trigger flex items-center justify-center"
                >
                    <span className="shell-account-initials" aria-hidden="true">
                        {user ? initials(user.name) : '?'}
                    </span>
                </button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                sideOffset={8}
                className="w-56 border-(--border) bg-(--card) p-1 text-(--foreground)"
            >
                {user && (
                    <>
                        <div className="shell-account-name truncate">
                            {user.name}
                        </div>
                        <div className="shell-account-email truncate">
                            {user.email}
                        </div>
                    </>
                )}
                <div className="mt-1 mb-1 border-t border-t-(--border)" />
                <Link
                    href={logout.url()}
                    method="post"
                    as="button"
                    className="shell-account-signout flex w-full items-center rounded-md px-3 text-left"
                >
                    Sign out
                </Link>
            </PopoverContent>
        </Popover>
    );
}
