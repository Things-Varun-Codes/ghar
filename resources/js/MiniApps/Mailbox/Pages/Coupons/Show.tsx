import CouponActions from '@/MiniApps/Mailbox/Components/CouponActions';
import CouponArtifact from '@/MiniApps/Mailbox/Components/CouponArtifact';
import type { CouponPayload } from '@/MiniApps/Mailbox/Components/CouponCard';
import MailboxLayout from '@/MiniApps/Mailbox/Layouts/MailboxLayout';
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
                room="Our Mailbox"
                documentTitle={`Coupon ${coupon.code ?? ''}`.trim()}
                backChevron
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
