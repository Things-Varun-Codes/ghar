import CouponActions from '@/MiniApps/Mailbox/Components/CouponActions';
import CouponArtifact from '@/MiniApps/Mailbox/Components/CouponArtifact';
import type { CouponPayload } from '@/MiniApps/Mailbox/Components/CouponCard';
import MailboxLayout, {
    MAILBOX_ROOM,
} from '@/MiniApps/Mailbox/Layouts/MailboxLayout';
import { index } from '@/routes/apps/our-exchange/coupons';
import Page from '@/Shell/Components/Page';

type Props = {
    coupon: CouponPayload;
};

export default function CouponsShow({ coupon }: Props) {
    return (
        <MailboxLayout>
            <Page
                tier="app"
                className="mailbox-artifact-page"
                title="Coupon"
                room={MAILBOX_ROOM}
                documentTitle={`Coupon ${coupon.code ?? ''}`.trim()}
                back={{ href: index.url(), label: 'Coupons' }}
            >
                <div>
                    <CouponArtifact coupon={coupon} />
                    <div className="mt-6">
                        <CouponActions coupon={coupon} />
                    </div>
                </div>
            </Page>
        </MailboxLayout>
    );
}
