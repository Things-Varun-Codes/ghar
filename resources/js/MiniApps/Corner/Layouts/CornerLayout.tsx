import type { ReactNode } from 'react';

import { ThemeAttrsProvider } from '@/hooks/use-theme-attrs';

type CornerLayoutProps = {
    children: ReactNode;
};

export default function CornerLayout({ children }: CornerLayoutProps) {
    return (
        <ThemeAttrsProvider value={{ app: 'our-corner' }}>
            <div
                data-app="our-corner"
                className="corner-page min-h-full bg-(--corner-bg) text-(--corner-ink)"
            >
                {children}
            </div>
        </ThemeAttrsProvider>
    );
}
