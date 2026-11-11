import { Link } from '@inertiajs/react';

import ChallanActions from '@/MiniApps/Mailbox/Components/ChallanActions';
import { show } from '@/routes/apps/our-mailbox/challans';

export type ChallanPayload = {
    id: number;
    ref_no: string | null;
    status: 'issued' | 'paid';
    offence: string;
    incident_date: string | null;
    incident_place: string | null;
    is_repeat: boolean;
    penalty: string;
    remarks: string | null;
    issued_at: string | null;
    issued_at_human: string | null;
    settled_at: string | null;
    is_mine: boolean;
    issuer: { id: number; name: string };
    recipient: { id: number; name: string };
    available_actions: string[];
};

const STATUS_META: Record<
    ChallanPayload['status'],
    { label: string; color: string }
> = {
    issued: { label: 'Issued', color: 'var(--mailbox-destructive)' },
    paid: { label: 'Paid', color: 'var(--mailbox-accent-text)' },
};

export default function ChallanCard({ challan }: { challan: ChallanPayload }) {
    const status = STATUS_META[challan.status];

    return (
        <div className="mailbox-card shell-card-stretch grid gap-2">
            <div className="flex items-baseline justify-between gap-3">
                <span className="font-(family-name:--mailbox-challan-font) text-[13px] text-(--mailbox-ink-soft)">
                    {challan.ref_no ?? '—'}
                </span>
                <span
                    className="mailbox-status-pill"
                    style={{
                        color: status.color,
                        border: `1px solid ${status.color}`,
                    }}
                >
                    {status.label}
                </span>
            </div>

            <Link
                href={show.url(challan.id)}
                className="mailbox-written shell-card-link"
            >
                {challan.offence}
            </Link>

            <span className="text-(length:--mailbox-type-scale-eyebrow) text-(--mailbox-ink-soft)">
                {challan.penalty}
                {challan.issued_at_human ? ` · ${challan.issued_at_human}` : ''}
            </span>

            <div className="mt-1">
                <ChallanActions challan={challan} variant="row" />
            </div>
        </div>
    );
}
