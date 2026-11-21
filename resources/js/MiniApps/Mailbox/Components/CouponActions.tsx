import type { CouponPayload } from '@/MiniApps/Mailbox/Components/CouponCard';
import IssuedActions from '@/MiniApps/Mailbox/Components/IssuedActions';
import type { IssuedAction } from '@/MiniApps/Mailbox/Components/IssuedActions';
import {
    cancel,
    destroy,
    fulfill,
    request,
} from '@/routes/apps/our-exchange/coupons';

export default function CouponActions({
    coupon,
    variant = 'detail',
}: {
    coupon: CouponPayload;
    variant?: 'row' | 'detail';
}) {
    const can = coupon.available_actions;
    const all: IssuedAction[] = [
        {
            kind: 'request',
            label: 'Request this',
            busyText: 'Requesting…',
            verb: 'Request',
            url: request.url(coupon.id),
            tone: 'primary',
        },
        {
            kind: 'fulfill',
            label: 'Fulfil it',
            busyText: 'Fulfilling…',
            verb: 'Fulfil',
            url: fulfill.url(coupon.id),
            tone: 'primary',
        },
        {
            kind: 'cancel',
            label: 'Cancel request',
            busyText: 'Cancelling…',
            verb: 'Cancel request for',
            url: cancel.url(coupon.id),
            tone: 'neutral',
        },
    ];

    return (
        <IssuedActions
            noun="coupon"
            subject={coupon.title}
            variant={variant}
            actions={all.filter((a) => can.includes(a.kind))}
            deleteUrl={
                can.includes('delete') ? destroy.url(coupon.id) : undefined
            }
        />
    );
}
