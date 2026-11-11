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

    const awaitText = coupon.is_mine
        ? `${coupon.recipient.name} is waiting on you to confirm.`
        : `Awaiting ${coupon.issuer.name}'s confirmation…`;

    return (
        <>
            <div className={cn('mailbox-coupon-doc', dim && 'is-depleted')}>
                <div className="mailbox-coupon-head">
                    <div className="mailbox-coupon-seal" aria-hidden="true">
                        {monogram(coupon.issuer.name, coupon.recipient.name)}
                    </div>
                    <div className="mailbox-coupon-eyebrow">
                        ◆ Department of the Household
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
                        Check off a square each time it's redeemed
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
                                {kind === 'checked' && (
                                    <span
                                        className="mailbox-coupon-check"
                                        aria-hidden="true"
                                    >
                                        ✓
                                    </span>
                                )}
                                {kind === 'next' && (
                                    <span aria-hidden="true">⏳</span>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="mailbox-coupon-remaining">
                        <b>{coupon.remaining}</b> of <b>{coupon.quantity}</b>{' '}
                        left
                        {isRequested && (
                            <span className="mailbox-coupon-stamp mailbox-coupon-stamp--requested">
                                Requested
                            </span>
                        )}
                        {isDepleted && (
                            <span className="mailbox-coupon-stamp mailbox-coupon-stamp--depleted">
                                Fully redeemed
                            </span>
                        )}
                        {isExpiredView && (
                            <span className="mailbox-coupon-stamp mailbox-coupon-stamp--expired">
                                Expired
                            </span>
                        )}
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
                <div className="mailbox-coupon-await">⏳ {awaitText}</div>
            )}
        </>
    );
}
