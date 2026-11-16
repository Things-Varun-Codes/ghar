import { Head, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import AccountMenu from '@/Shell/Components/AccountMenu';
import BottomBar from '@/Shell/Components/BottomBar';
import MobileTopBar from '@/Shell/Components/MobileTopBar';
import PullToRefresh from '@/Shell/Components/PullToRefresh';
import Sidebar from '@/Shell/Components/Sidebar';
import {
    ShellChromeProvider,
    useInShellChrome,
} from '@/Shell/Layouts/shell-chrome';
import type { MiniApp } from '@/types/miniapp';

/*
 * The signed-in shell. app.tsx sets it as the default Inertia layout, so it stays mounted from
 * one visit to the next. A page that still wraps itself in <AppLayout> gets its children back
 * unchanged, so the chrome is never rendered twice.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
    if (useInShellChrome()) {
        return <>{children}</>;
    }

    return (
        <ShellChromeProvider>
            <Shell>{children}</Shell>
        </ShellChromeProvider>
    );
}

function Shell({ children }: { children: ReactNode }) {
    const { props, component } = usePage<{ miniApps?: MiniApp[] }>();

    const activeApp = (props.miniApps ?? []).find(
        (app) =>
            app.component_prefix && component?.startsWith(app.component_prefix),
    )?.slug;

    return (
        <>
            <Head>
                <meta name="robots" content="noindex, nofollow" />
            </Head>

            <div
                id="shell-chrome"
                data-active-app={activeApp}
                className="shell-frame min-h-screen"
            >
                <a
                    href="#main-content"
                    className="shell-focus shell-skip-link sr-only focus:not-sr-only focus:fixed focus:left-4 focus:z-[60]"
                >
                    Skip to main content
                </a>

                <aside className="fixed top-0 bottom-0 left-0 hidden w-60 overflow-y-auto overscroll-contain lg:block">
                    <Sidebar />
                </aside>

                <div className="fixed top-4 right-4 z-40 hidden lg:block">
                    <AccountMenu />
                </div>

                <div className="lg:hidden">
                    <MobileTopBar />
                </div>

                {/* .shell-main's bottom padding clears the Fab and the bottom bar; .history-bleed cancels it. */}
                <main
                    id="main-content"
                    tabIndex={-1}
                    className="shell-sheet shell-main"
                >
                    <PullToRefresh>{children}</PullToRefresh>
                </main>

                <BottomBar />
            </div>
        </>
    );
}
