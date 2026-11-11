import { Link } from '@inertiajs/react';

import { cn } from '@/lib/utils';
import CouponActions from '@/MiniApps/Mailbox/Components/CouponActions';
import { show } from '@/routes/apps/our-mailbox/coupons';

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
    issuer: { id: number; name: string };
    recipient: { id: number; name: string };
    available_actions: string[];
};

const STATUS_META: Record<CouponStatus, { label: string; color: string }> = {
    issued: { label: 'Ready', color: 'var(--mailbox-accent-text)' },
    requested: { label: 'Requested', color: 'var(--mailbox-accent-text)' },
    depleted: { label: 'Redeemed', color: 'var(--mailbox-ink-soft)' },
};

const MAX_PIPS = 10;

export default function CouponCard({ coupon }: { coupon: CouponPayload }) {
    // An expired coupon is still status=issued, so the chip has to check expiry.
    const isExpiredView = coupon.is_expired && coupon.status === 'issued';
    const status = isExpiredView
        ? { label: 'Expired', color: 'var(--mailbox-ink-soft)' }
        : STATUS_META[coupon.status];
    const pipCount = Math.min(coupon.quantity, MAX_PIPS);

    return (
        <div className="mailbox-card shell-card-stretch grid gap-2">
            <div className="flex items-baseline justify-between gap-3">
                <span className="font-(family-name:--mailbox-coupon-font-mono) text-[13px] text-(--mailbox-ink-soft)">
                    {coupon.code ?? '—'}
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
                href={show.url(coupon.id)}
                className="shell-card-link mailbox-coupon-card-title"
            >
                {coupon.title}
            </Link>

            <div className="flex flex-wrap items-center gap-2.5">
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
                <span className="text-(length:--mailbox-type-scale-eyebrow) text-(--mailbox-ink-soft)">
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
