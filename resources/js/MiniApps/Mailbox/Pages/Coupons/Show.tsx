import { Head } from '@inertiajs/react';

import { pageTitle } from '@/lib/title';

import CouponActions from '@/MiniApps/Mailbox/Components/CouponActions';
import CouponArtifact from '@/MiniApps/Mailbox/Components/CouponArtifact';
import type { CouponPayload } from '@/MiniApps/Mailbox/Components/CouponCard';
import MailboxLayout from '@/MiniApps/Mailbox/Layouts/MailboxLayout';
import Page from '@/Shell/Components/Page';
import AppLayout from '@/Shell/Layouts/AppLayout';

type Props = {
    coupon: CouponPayload;
};

export default function CouponsShow({ coupon }: Props) {
    return (
        <AppLayout>
            <Head
                title={pageTitle(
                    `Coupon ${coupon.code ?? ''}`.trim(),
                    'Our Mailbox',
                )}
            />
            <MailboxLayout>
                <Page
                    tier="app"
                    className="mailbox-artifact-page"
                    title="Coupon"
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
        </AppLayout>
    );
}
