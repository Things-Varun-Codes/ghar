import { Gavel } from 'lucide-react';
import { useState } from 'react';

import CitationCard from '@/MiniApps/Mailbox/Components/CitationCard';
import type { CitationPayload } from '@/MiniApps/Mailbox/Components/CitationCard';
import CitationSheet from '@/MiniApps/Mailbox/Components/CitationSheet';
import MailboxListPage from '@/MiniApps/Mailbox/Components/MailboxListPage';
import type { HouseholdMember } from '@/MiniApps/Mailbox/Components/RecipientPicker';
import MailboxLayout from '@/MiniApps/Mailbox/Layouts/MailboxLayout';
import { index } from '@/routes/apps/our-exchange/citations';
import type { Paginated } from '@/types/paginated';

type Tab = 'received' | 'issued';

type Props = {
    citations: Paginated<CitationPayload>;
    tab: Tab;
    sort: 'recent' | 'oldest';
    q: string | null;
    members: HouseholdMember[];
};

export default function CitationsIndex({
    citations,
    tab,
    sort,
    q,
    members,
}: Props) {
    const [sheetOpen, setSheetOpen] = useState(false);

    const emptyCopy =
        tab === 'received'
            ? {
                  title: 'No citations against you yet.',
                  body: 'When someone files one, it shows up here.',
              }
            : {
                  title: "You haven't issued any citations yet.",
                  body: 'Tap the plus button to issue your first one.',
              };

    return (
        <MailboxLayout>
            <MailboxListPage
                pageTitle="Citations"
                paginator={citations}
                countAll={citations.counts?.all ?? citations.data.length}
                countNoun={{ one: 'citation', other: 'citations' }}
                propName="citations"
                tab={tab}
                tabsAriaLabel="Citation tabs"
                tabItems={[
                    { key: 'received', label: 'Received' },
                    { key: 'issued', label: 'Issued' },
                ]}
                tabHrefFor={(k) => index.url({ query: { tab: k } })}
                sort={sort}
                query={q}
                searchPlaceholder="Search citations"
                fabAriaLabel="Issue a citation"
                onFabClick={() => setSheetOpen(true)}
                emptyIcon={Gavel}
                emptyTitle={emptyCopy.title}
                emptyBody={emptyCopy.body}
                renderItem={(citation) => (
                    <CitationCard key={citation.id} citation={citation} />
                )}
            >
                <CitationSheet
                    open={sheetOpen}
                    onOpenChange={setSheetOpen}
                    members={members}
                />
            </MailboxListPage>
        </MailboxLayout>
    );
}
