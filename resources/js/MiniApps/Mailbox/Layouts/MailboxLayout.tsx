import type { ReactNode } from 'react';

import { ThemeAttrsProvider } from '@/hooks/use-theme-attrs';

type MailboxLayoutProps = {
    children: ReactNode;
};

export default function MailboxLayout({ children }: MailboxLayoutProps) {
    return (
        <ThemeAttrsProvider value={{ app: 'our-mailbox' }}>
            <div
                data-app="our-mailbox"
                className="mailbox-page min-h-full bg-(--mailbox-bg) text-(--mailbox-ink)"
            >
                {children}
            </div>
        </ThemeAttrsProvider>
    );
}
