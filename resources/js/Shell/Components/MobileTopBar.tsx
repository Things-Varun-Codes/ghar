import { Link, usePage } from '@inertiajs/react';
import { Menu } from 'lucide-react';
import { dashboard } from '@/routes';
import AccountMenu from '@/Shell/Components/AccountMenu';
import HeartMark from '@/Shell/Components/HeartMark';

export default function MobileTopBar({
    onMenuClick,
}: {
    onMenuClick: () => void;
}) {
    const appName = usePage().props.name;

    return (
        <header className="fixed top-0 right-0 left-0 z-50 flex h-14 items-center justify-between bg-(--sidebar) px-2">
            <button
                type="button"
                onClick={onMenuClick}
                aria-label="Open navigation"
                className="flex h-[44px] w-[44px] items-center justify-center rounded-lg text-(--foreground)"
            >
                <Menu size={24} aria-hidden="true" />
            </button>
            <div className="inline-flex items-center gap-1">
                <Link
                    href={dashboard().url}
                    aria-label="Go to dashboard"
                    className="cursor-pointer transition-opacity hover:opacity-85"
                >
                    <div className="shell-wordmark-topbar">
                        {appName}
                        <HeartMark size={13} filled />
                    </div>
                </Link>
            </div>

            <AccountMenu />
        </header>
    );
}
