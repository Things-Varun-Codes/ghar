import { Head } from '@inertiajs/react';
import type { ReactNode } from 'react';

export default function GuestLayout({ children }: { children: ReactNode }) {
    return (
        <>
            <Head>
                <meta name="robots" content="noindex, nofollow" />
            </Head>
            <main
                data-shell="guest"
                className="flex min-h-screen flex-col items-center justify-center bg-(--background) px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
            >
                {children}
            </main>
        </>
    );
}
