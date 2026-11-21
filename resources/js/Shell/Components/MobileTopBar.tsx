import { Link, usePage } from '@inertiajs/react';
import { dashboard } from '@/routes';
import AccountMenu from '@/Shell/Components/AccountMenu';
import AppMark from '@/Shell/Components/AppMark';
import BackChevron from '@/Shell/Components/BackChevron';
import { useShellPageInfo } from '@/Shell/Layouts/shell-chrome';
import type { MiniApp } from '@/types/miniapp';

/*
 * Below `lg`: the wordmark on Home; elsewhere back on the left and the page's title, so where
 * you are and the way back stay on screen while the page scrolls.
 */
export default function MobileTopBar({
    activeRoom,
}: {
    activeRoom: MiniApp | undefined;
}) {
    const { props, component } = usePage();
    const info = useShellPageInfo();
    const appName = props.name;
    const onHome = component === 'Shell/Pages/Dashboard';

    const title = info?.title ?? activeRoom?.name ?? appName;

    return (
        <header className="shell-topbar fixed top-0 right-0 left-0 z-(--z-topbar) grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2 bg-(--sidebar)">
            <div className="flex">
                {!onHome && <BackChevron back={info?.back} />}
            </div>

            {onHome ? (
                <Link
                    href={dashboard().url}
                    aria-label={`${appName}, go to Home`}
                    className="shell-focus inline-flex min-h-11 items-center justify-self-center rounded-full px-2"
                >
                    <span className="shell-wordmark-topbar">
                        <AppMark />
                        {appName}
                    </span>
                </Link>
            ) : (
                <p className="shell-topbar-title" title={title}>
                    {title}
                </p>
            )}

            <AccountMenu />
        </header>
    );
}
