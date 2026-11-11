import { Head, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import {
    Sheet,
    SheetContent,
    SheetTitle,
    SheetHeader,
} from '@/components/ui/sheet';
import { ThemeAttrsProvider } from '@/hooks/use-theme-attrs';
import AccountMenu from '@/Shell/Components/AccountMenu';
import MobileTopBar from '@/Shell/Components/MobileTopBar';
import PullToRefresh from '@/Shell/Components/PullToRefresh';
import Sidebar from '@/Shell/Components/Sidebar';

type MiniAppShared = {
    slug: string;
    component_prefix?: string;
};

type SharedProps = {
    activeTheme?: string;
    miniApps?: MiniAppShared[];
};

export default function AppLayout({ children }: { children: ReactNode }) {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const { props, component } = usePage<SharedProps>();
    const activeTheme = props.activeTheme ?? 'pastel';

    const miniApps = (props.miniApps ?? []) as MiniAppShared[];
    const activeApp = miniApps.find(
        (app) =>
            app.component_prefix && component?.startsWith(app.component_prefix),
    )?.slug;

    return (
        <ThemeAttrsProvider value={{ theme: activeTheme }}>
            <Head>
                <meta name="robots" content="noindex, nofollow" />
            </Head>

            <div
                id="shell-chrome"
                data-theme={activeTheme}
                data-active-app={activeApp}
                className="shell-frame min-h-screen"
            >
                <a
                    href="#main-content"
                    className="shell-focus shell-skip-link sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50"
                >
                    Skip to main content
                </a>

                <aside className="fixed top-0 bottom-0 left-0 hidden w-60 overflow-y-auto overscroll-contain md:block">
                    <Sidebar />
                </aside>

                <div className="fixed top-4 right-4 z-40 hidden md:block">
                    <AccountMenu />
                </div>

                <div className="md:hidden">
                    <MobileTopBar onMenuClick={() => setDrawerOpen(true)} />
                </div>

                <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                    <SheetContent
                        side="left"
                        className="w-[80vw] max-w-[300px] bg-(--sidebar) p-0"
                    >
                        <SheetHeader className="sr-only">
                            <SheetTitle>Navigation</SheetTitle>
                        </SheetHeader>
                        <Sidebar onNavigate={() => setDrawerOpen(false)} />
                    </SheetContent>
                </Sheet>

                {/*
                 * pb-24 clears the fixed Fab; .history-bleed cancels it, so keep the two in step.
                 */}
                <main
                    id="main-content"
                    tabIndex={-1}
                    className="shell-sheet px-4 pt-[72px] pb-24 md:ml-60 md:px-8 md:pt-8 md:pb-24"
                >
                    <PullToRefresh>{children}</PullToRefresh>
                </main>
            </div>
        </ThemeAttrsProvider>
    );
}
