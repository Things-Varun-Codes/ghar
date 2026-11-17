import type { ReactNode } from 'react';

import RoomScope from '@/Shell/Components/RoomScope';

export const CORNER_ROOM = 'Our Corner';

type CornerLayoutProps = {
    children: ReactNode;
};

export default function CornerLayout({ children }: CornerLayoutProps) {
    return (
        <RoomScope
            slug="our-corner"
            className="corner-page min-h-full bg-(--corner-bg) text-(--corner-ink)"
        >
            {children}
        </RoomScope>
    );
}
