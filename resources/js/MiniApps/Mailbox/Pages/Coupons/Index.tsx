import { Ticket } from 'lucide-react';
import { useState } from 'react';

import CouponCard from '@/MiniApps/Mailbox/Components/CouponCard';
import type { CouponPayload } from '@/MiniApps/Mailbox/Components/CouponCard';
import CouponSheet from '@/MiniApps/Mailbox/Components/CouponSheet';
import MailboxListPage from '@/MiniApps/Mailbox/Components/MailboxListPage';
import type { HouseholdMember } from '@/MiniApps/Mailbox/Components/RecipientPicker';
import MailboxLayout from '@/MiniApps/Mailbox/Layouts/MailboxLayout';
import { index } from '@/routes/apps/our-mailbox/coupons';
import AppLayout from '@/Shell/Layouts/AppLayout';
import type { Paginated } from '@/types/paginated';

type Tab = 'received' | 'issued';

type Props = {
    coupons: Paginated<CouponPayload>;
    tab: Tab;
    sort: 'recent' | 'oldest';
    q: string | null;
    members: HouseholdMember[];
};

export default function CouponsIndex({
    coupons,
    tab,
    sort,
    q,
    members,
}: Props) {
    const [sheetOpen, setSheetOpen] = useState(false);

    const emptyCopy =
        tab === 'received'
            ? {
                  title: 'No coupons yet.',
                  body: 'When someone sends one, it shows up here.',
              }
            : {
                  title: "You haven't sent any coupons yet.",
                  body: 'Tap the button to write your first one.',
              };

    return (
        <AppLayout>
            <MailboxLayout>
                <MailboxListPage
                    headTitle="Coupons · Our Mailbox"
                    pageTitle="Coupons"
                    paginator={coupons}
                    countAll={coupons.counts?.all ?? coupons.data.length}
                    countNoun={{ one: 'coupon', other: 'coupons' }}
                    propName="coupons"
                    tab={tab}
                    tabsAriaLabel="Coupon tabs"
                    tabItems={[
                        { key: 'received', label: 'Received' },
                        { key: 'issued', label: 'Issued' },
                    ]}
                    tabHrefFor={(k) => index.url({ query: { tab: k } })}
                    sort={sort}
                    query={q}
                    searchPlaceholder="Search coupons"
                    fabAriaLabel="Write a coupon"
                    onFabClick={() => setSheetOpen(true)}
                    emptyIcon={Ticket}
                    emptyTitle={emptyCopy.title}
                    emptyBody={emptyCopy.body}
                    itemGap={12}
                    renderItem={(coupon) => (
                        <CouponCard key={coupon.id} coupon={coupon} />
                    )}
                >
                    <CouponSheet
                        open={sheetOpen}
                        onOpenChange={setSheetOpen}
                        members={members}
                    />
                </MailboxListPage>
            </MailboxLayout>
        </AppLayout>
    );
}
