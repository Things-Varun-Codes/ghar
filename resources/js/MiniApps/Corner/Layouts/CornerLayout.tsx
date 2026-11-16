import type { ReactNode } from 'react';

import { AppAttrsProvider } from '@/hooks/use-app-attrs';

export const CORNER_ROOM = 'Our Corner';

type CornerLayoutProps = {
    children: ReactNode;
};

export default function CornerLayout({ children }: CornerLayoutProps) {
    return (
        <AppAttrsProvider app="our-corner">
            <div
                data-app="our-corner"
                className="corner-page min-h-full bg-(--corner-bg) text-(--corner-ink)"
            >
                {children}
            </div>
        </AppAttrsProvider>
    );
}
