import type { ReactNode } from 'react';

import { AppAttrsProvider } from '@/hooks/use-app-attrs';

type Props = {
    slug: string;
    className: string;
    children: ReactNode;
};

/* A room's styling scope: its pages and, through useAppAttrs, the portals they open. */
export default function RoomScope({ slug, className, children }: Props) {
    return (
        <AppAttrsProvider app={slug}>
            <div data-app={slug} className={className}>
                {children}
            </div>
        </AppAttrsProvider>
    );
}
