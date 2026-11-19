import type { ReactNode } from 'react';

import RoomScope from '@/Shell/Components/RoomScope';

export const CORNER_ROOM = 'Our Shelf';

type CornerLayoutProps = {
    children: ReactNode;
};

export default function CornerLayout({ children }: CornerLayoutProps) {
    return (
        <RoomScope
            slug="our-shelf"
            className="corner-page min-h-full bg-(--corner-bg) text-(--corner-ink)"
        >
            {children}
        </RoomScope>
    );
}
