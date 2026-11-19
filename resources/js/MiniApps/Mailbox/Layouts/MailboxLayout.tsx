import type { ReactNode } from 'react';

import RoomScope from '@/Shell/Components/RoomScope';

export const MAILBOX_ROOM = 'Our Exchange';

type MailboxLayoutProps = {
    children: ReactNode;
};

export default function MailboxLayout({ children }: MailboxLayoutProps) {
    return (
        <RoomScope
            slug="our-exchange"
            className="mailbox-page min-h-full bg-(--mailbox-bg) text-(--mailbox-ink)"
        >
            {children}
        </RoomScope>
    );
}
