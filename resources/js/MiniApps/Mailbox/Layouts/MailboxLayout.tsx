import type { ReactNode } from 'react';

import { AppAttrsProvider } from '@/hooks/use-app-attrs';

type MailboxLayoutProps = {
    children: ReactNode;
};

export default function MailboxLayout({ children }: MailboxLayoutProps) {
    return (
        <AppAttrsProvider app="our-mailbox">
            <div
                data-app="our-mailbox"
                className="mailbox-page min-h-full bg-(--mailbox-bg) text-(--mailbox-ink)"
            >
                {children}
            </div>
        </AppAttrsProvider>
    );
}
