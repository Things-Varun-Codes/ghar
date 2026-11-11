import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';

type Props = {
    href: string;
    icon: ReactNode;
    title: string;
    status: string;
    statusTone?: 'muted' | 'alert';
    preview?: ReactNode;
    ariaLabel: string;
};

export default function MailboxPinCard({
    href,
    icon,
    title,
    status,
    statusTone = 'muted',
    preview,
    ariaLabel,
}: Props) {
    return (
        <Link
            href={href}
            aria-label={ariaLabel}
            className="mailbox-pin-card text-inherit no-underline"
        >
            <div className="flex items-center gap-2">
                <span
                    aria-hidden="true"
                    className="inline-flex text-(--mailbox-accent-text)"
                >
                    {icon}
                </span>
                <span className="mailbox-pin-title">{title}</span>
            </div>

            <p
                className="mx-0 mt-2 mb-0 text-[15px]"
                style={{
                    fontWeight: statusTone === 'alert' ? 500 : 400,
                    color:
                        statusTone === 'alert'
                            ? 'var(--mailbox-accent-text)'
                            : 'var(--mailbox-ink-soft)',
                }}
            >
                {status}
            </p>

            {preview !== undefined && (
                <p className="mailbox-pin-preview">{preview}</p>
            )}
        </Link>
    );
}
