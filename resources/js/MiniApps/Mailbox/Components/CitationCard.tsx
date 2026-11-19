import { Link } from '@inertiajs/react';
import type { ComponentProps } from 'react';

import { Badge } from '@/components/ui/badge';

import CitationActions from '@/MiniApps/Mailbox/Components/CitationActions';
import { show } from '@/routes/apps/our-exchange/citations';
import type { Person } from '@/types/person';

type BadgeVariant = ComponentProps<typeof Badge>['variant'];

export type CitationPayload = {
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
    issuer: Person;
    recipient: Person;
    available_actions: string[];
};

const STATUS_META: Record<
    CitationPayload['status'],
    { label: string; variant: BadgeVariant }
> = {
    issued: { label: 'Issued', variant: 'destructive' },
    paid: { label: 'Paid', variant: 'default' },
};

export default function CitationCard({
    citation,
}: {
    citation: CitationPayload;
}) {
    const status = STATUS_META[citation.status];

    return (
        <div className="mailbox-card shell-card-stretch shell-lift grid gap-2">
            <div className="flex items-baseline justify-between gap-3">
                <span className="font-(family-name:--mailbox-citation-font) text-(length:--text-meta) text-(--mailbox-ink-soft) tabular-nums">
                    {citation.ref_no ?? '—'}
                </span>
                <Badge variant={status.variant}>{status.label}</Badge>
            </div>

            <Link
                href={show.url(citation.id)}
                className="mailbox-written shell-card-link"
            >
                {citation.offence}
            </Link>

            <span className="text-(length:--mailbox-type-scale-eyebrow) text-(--mailbox-ink-soft)">
                {citation.penalty}
                {citation.issued_at_human
                    ? ` · ${citation.issued_at_human}`
                    : ''}
            </span>

            <div className="mt-1">
                <CitationActions citation={citation} variant="row" />
            </div>
        </div>
    );
}
