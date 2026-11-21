import { Head, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { pathOf } from '@/lib/url';
import AccountMenu from '@/Shell/Components/AccountMenu';
import BottomBar from '@/Shell/Components/BottomBar';
import MobileTopBar from '@/Shell/Components/MobileTopBar';
import PullToRefresh from '@/Shell/Components/PullToRefresh';
import ScrollToTop from '@/Shell/Components/ScrollToTop';
import Sidebar from '@/Shell/Components/Sidebar';
import { ShellChromeProvider } from '@/Shell/Layouts/shell-chrome';
import { activeMiniApp, miniAppForComponent } from '@/Shell/lib/active-room';
import type { MiniApp } from '@/types/miniapp';

// The signed-in shell: app.tsx's default layout, so it stays mounted from one visit to the next.
export default function AppLayout({ children }: { children: ReactNode }) {
    return (
        <ShellChromeProvider>
            <Shell>{children}</Shell>
        </ShellChromeProvider>
    );
}

function Shell({ children }: { children: ReactNode }) {
    const { props, component, url } = usePage<{ miniApps?: MiniApp[] }>();
    const miniApps = props.miniApps ?? [];
    const path = pathOf(url);
    const activeRoom = activeMiniApp(miniApps, component, path);

    return (
        <>
            <Head>
                <meta name="robots" content="noindex, nofollow" />
            </Head>

            <div
                id="shell-chrome"
                data-active-app={miniAppForComponent(miniApps, component)?.slug}
                className="shell-frame min-h-screen"
            >
                <a
                    href="#main-content"
                    className="shell-focus shell-skip-link sr-only focus:not-sr-only focus:fixed focus:left-4 focus:z-(--z-skip)"
                >
                    Skip to main content
                </a>

                <aside className="fixed top-0 bottom-0 left-0 hidden w-(--shell-sidebar-w) overflow-y-auto overscroll-contain lg:block">
                    <Sidebar />
                </aside>

                <div className="fixed top-4 right-4 z-(--z-chrome) hidden lg:block">
                    <AccountMenu />
                </div>

                <div className="lg:hidden">
                    <MobileTopBar activeRoom={activeRoom} />
                </div>

                {/* .shell-main's bottom padding clears the Fab and the bottom bar; .history-bleed cancels it. */}
                <main
                    id="main-content"
                    tabIndex={-1}
                    className="shell-sheet shell-main"
                >
                    <PullToRefresh>{children}</PullToRefresh>
                </main>

                {/* Keyed by the address: a new page starts at the top, so the button starts hidden. */}
                <ScrollToTop key={url} />

                <BottomBar path={path} activeRoom={activeRoom} />
            </div>
        </>
    );
}
