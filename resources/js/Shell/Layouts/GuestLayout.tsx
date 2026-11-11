import { Head, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { ThemeAttrsProvider } from '@/hooks/use-theme-attrs';

type SharedProps = {
    activeTheme?: string;
};

export default function GuestLayout({ children }: { children: ReactNode }) {
    const { props } = usePage<SharedProps>();
    const activeTheme = props.activeTheme ?? 'pastel';

    return (
        <ThemeAttrsProvider value={{ theme: activeTheme }}>
            <Head>
                <meta name="robots" content="noindex, nofollow" />
            </Head>
            <div
                data-shell="guest"
                data-theme={activeTheme}
                className="flex min-h-screen flex-col items-center justify-center bg-(--background) px-6"
            >
                {children}
            </div>
        </ThemeAttrsProvider>
    );
}
