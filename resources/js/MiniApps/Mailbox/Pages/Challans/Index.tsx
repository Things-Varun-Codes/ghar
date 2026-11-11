import { Gavel } from 'lucide-react';
import { useState } from 'react';

import ChallanCard from '@/MiniApps/Mailbox/Components/ChallanCard';
import type { ChallanPayload } from '@/MiniApps/Mailbox/Components/ChallanCard';
import ChallanSheet from '@/MiniApps/Mailbox/Components/ChallanSheet';
import MailboxListPage from '@/MiniApps/Mailbox/Components/MailboxListPage';
import type { HouseholdMember } from '@/MiniApps/Mailbox/Components/RecipientPicker';
import MailboxLayout from '@/MiniApps/Mailbox/Layouts/MailboxLayout';
import { index } from '@/routes/apps/our-mailbox/challans';
import AppLayout from '@/Shell/Layouts/AppLayout';
import type { Paginated } from '@/types/paginated';

type Tab = 'received' | 'issued';

type Props = {
    challans: Paginated<ChallanPayload>;
    tab: Tab;
    sort: 'recent' | 'oldest';
    q: string | null;
    members: HouseholdMember[];
};

export default function ChallansIndex({
    challans,
    tab,
    sort,
    q,
    members,
}: Props) {
    const [sheetOpen, setSheetOpen] = useState(false);

    const emptyCopy =
        tab === 'received'
            ? {
                  title: 'No citations against you. Yet.',
                  body: 'When someone files one, it shows up here.',
              }
            : {
                  title: "You haven't issued any citations yet.",
                  body: 'Tap the button to file your first one.',
              };

    return (
        <AppLayout>
            <MailboxLayout>
                <MailboxListPage
                    headTitle="Challans · Our Mailbox"
                    pageTitle="Challans"
                    paginator={challans}
                    countAll={challans.counts?.all ?? challans.data.length}
                    countNoun={{ one: 'challan', other: 'challans' }}
                    propName="challans"
                    tab={tab}
                    tabsAriaLabel="Challan tabs"
                    tabItems={[
                        { key: 'received', label: 'Received' },
                        { key: 'issued', label: 'Issued' },
                    ]}
                    tabHrefFor={(k) => index.url({ query: { tab: k } })}
                    sort={sort}
                    query={q}
                    searchPlaceholder="Search challans"
                    fabAriaLabel="Issue a challan"
                    onFabClick={() => setSheetOpen(true)}
                    emptyIcon={Gavel}
                    emptyTitle={emptyCopy.title}
                    emptyBody={emptyCopy.body}
                    itemGap={12}
                    renderItem={(challan) => (
                        <ChallanCard key={challan.id} challan={challan} />
                    )}
                >
                    <ChallanSheet
                        open={sheetOpen}
                        onOpenChange={setSheetOpen}
                        members={members}
                    />
                </MailboxListPage>
            </MailboxLayout>
        </AppLayout>
    );
}
