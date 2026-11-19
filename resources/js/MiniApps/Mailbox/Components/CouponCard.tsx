import { Link } from '@inertiajs/react';
import type { ComponentProps } from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import CouponActions from '@/MiniApps/Mailbox/Components/CouponActions';
import { show } from '@/routes/apps/our-exchange/coupons';
import type { Person } from '@/types/person';

type BadgeVariant = ComponentProps<typeof Badge>['variant'];

type CouponStatus = 'issued' | 'requested' | 'depleted';

export type CouponPayload = {
    id: number;
    code: string | null;
    status: CouponStatus;
    title: string;
    description: string | null;
    quantity: number;
    redeemed_count: number;
    remaining: number;
    expires_at: string | null;
    is_expired: boolean;
    has_pending_request: boolean;
    requested_at: string | null;
    issued_at: string | null;
    issued_at_human: string | null;
    last_fulfilled_at: string | null;
    is_mine: boolean;
    issuer: Person;
    recipient: Person;
    available_actions: string[];
};

const STATUS_META: Record<
    CouponStatus,
    { label: string; variant: BadgeVariant }
> = {
    issued: { label: 'Ready', variant: 'default' },
    requested: { label: 'Requested', variant: 'default' },
    depleted: { label: 'Redeemed', variant: 'outline' },
};

const MAX_PIPS = 10;

export default function CouponCard({ coupon }: { coupon: CouponPayload }) {
    // An expired coupon is still status=issued, so the chip has to check expiry.
    const isExpiredView = coupon.is_expired && coupon.status === 'issued';
    const status = isExpiredView
        ? { label: 'Expired', variant: 'outline' as const }
        : STATUS_META[coupon.status];
    const pipCount = Math.min(coupon.quantity, MAX_PIPS);

    return (
        <div className="mailbox-card shell-card-stretch shell-lift grid gap-2">
            <div className="flex items-baseline justify-between gap-3">
                <span className="font-(family-name:--mailbox-coupon-font-mono) text-(length:--text-meta) text-(--mailbox-ink-soft) tabular-nums">
                    {coupon.code ?? '—'}
                </span>
                <Badge variant={status.variant}>{status.label}</Badge>
            </div>

            <Link
                href={show.url(coupon.id)}
                className="shell-card-link mailbox-coupon-card-title"
            >
                {coupon.title}
            </Link>

            <div className="flex flex-wrap items-center gap-3">
                <span className="mailbox-coupon-pips" aria-hidden="true">
                    {Array.from({ length: pipCount }).map((_, i) => (
                        <span
                            key={i}
                            className={cn(
                                'mailbox-coupon-pip',
                                i < coupon.redeemed_count && 'is-checked',
                            )}
                        />
                    ))}
                </span>
                <span className="text-(length:--mailbox-type-scale-eyebrow) text-(--mailbox-ink-soft) tabular-nums">
                    {coupon.remaining} of {coupon.quantity} left
                    {coupon.issued_at_human
                        ? ` · ${coupon.issued_at_human}`
                        : ''}
                </span>
            </div>

            <div className="mt-1">
                <CouponActions coupon={coupon} variant="row" />
            </div>
        </div>
    );
}
