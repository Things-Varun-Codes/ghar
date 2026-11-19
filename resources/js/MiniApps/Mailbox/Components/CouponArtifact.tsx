import { Check, Hourglass } from 'lucide-react';

import { Pop } from '@/components/motion';
import { cn } from '@/lib/utils';
import type { CouponPayload } from '@/MiniApps/Mailbox/Components/CouponCard';
import { formatPlainDay } from '@/MiniApps/Mailbox/lib/formatDay';
import { monogram } from '@/MiniApps/Mailbox/lib/monogram';

export default function CouponArtifact({ coupon }: { coupon: CouponPayload }) {
    const isDepleted = coupon.status === 'depleted';
    const isRequested = coupon.status === 'requested';
    const isExpiredView = coupon.is_expired && coupon.status === 'issued';
    const dim = isDepleted || isExpiredView;

    const boxes = Array.from({ length: coupon.quantity }).map((_, i) => {
        if (i < coupon.redeemed_count) {
            return 'checked' as const;
        }

        if (isRequested && i === coupon.redeemed_count) {
            return 'next' as const;
        }

        return 'open' as const;
    });

    const stamp = isRequested
        ? { tone: 'requested', label: 'Requested' }
        : isDepleted
          ? { tone: 'depleted', label: 'Fully redeemed' }
          : isExpiredView
            ? { tone: 'expired', label: 'Expired' }
            : null;

    const awaitText = coupon.is_mine
        ? `${coupon.recipient.name} asked for this. Fulfil it when it's done.`
        : `Waiting for ${coupon.issuer.name} to fulfil it.`;

    return (
        <>
            <div className={cn('mailbox-coupon-doc', dim && 'is-depleted')}>
                <div className="mailbox-coupon-head">
                    <div className="mailbox-coupon-seal" aria-hidden="true">
                        {monogram(coupon.issuer.name, coupon.recipient.name)}
                    </div>
                    <div className="mailbox-coupon-eyebrow">
                        Department of the Household
                    </div>
                    <div className="mailbox-coupon-title">{coupon.title}</div>
                    {coupon.description && (
                        <div className="mailbox-coupon-desc">
                            {coupon.description}
                        </div>
                    )}
                </div>

                <div className="mailbox-coupon-body">
                    <div className="mailbox-coupon-punchlabel">
                        Each redemption checks off a square
                    </div>
                    <div className="mailbox-coupon-grid">
                        {boxes.map((kind, i) => (
                            <div
                                key={i}
                                className={cn(
                                    'mailbox-coupon-box',
                                    kind === 'checked' && 'is-checked',
                                    kind === 'next' && 'is-next',
                                )}
                            >
                                <span className="mailbox-coupon-box-n">
                                    {i + 1}
                                </span>
                                <Pop show={kind === 'checked'}>
                                    <span
                                        className="mailbox-coupon-check"
                                        aria-hidden="true"
                                    >
                                        <Check size={24} strokeWidth={2} />
                                    </span>
                                </Pop>
                                {kind === 'next' && (
                                    <Hourglass
                                        size={20}
                                        strokeWidth={1.5}
                                        aria-hidden="true"
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="mailbox-coupon-remaining">
                        <b>{coupon.remaining}</b> of <b>{coupon.quantity}</b>{' '}
                        left
                        <Pop
                            show={stamp !== null}
                            changeKey={stamp?.tone}
                            className="mailbox-coupon-stamp-slot"
                        >
                            {stamp && (
                                <span
                                    className={`mailbox-coupon-stamp mailbox-coupon-stamp--${stamp.tone}`}
                                >
                                    {stamp.label}
                                </span>
                            )}
                        </Pop>
                    </div>
                </div>

                <div className="mailbox-coupon-foot">
                    <div>
                        <span className="mailbox-coupon-foot-lbl">No.</span>
                        <span className="mailbox-coupon-foot-val">
                            {coupon.code ?? '—'}
                        </span>
                    </div>
                    <div>
                        <span className="mailbox-coupon-foot-lbl">
                            Issued by
                        </span>
                        <span className="mailbox-coupon-foot-val">
                            {coupon.issuer.name}
                        </span>
                    </div>
                    {coupon.expires_at && (
                        <div>
                            <span className="mailbox-coupon-foot-lbl">
                                Valid until
                            </span>
                            <span className="mailbox-coupon-foot-val">
                                {formatPlainDay(coupon.expires_at, '')}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {isRequested && (
                <div className="mailbox-coupon-await">
                    <Hourglass size={16} strokeWidth={1.5} aria-hidden="true" />
                    {awaitText}
                </div>
            )}
        </>
    );
}
