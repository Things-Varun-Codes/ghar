import { router } from '@inertiajs/react';
import { Heart } from 'lucide-react';
import { useState } from 'react';

import { mutationOptions } from '@/lib/mutation';
import type { BouquetItem } from '@/MiniApps/Mailbox/Components/BouquetCard';
import BouquetCard from '@/MiniApps/Mailbox/Components/BouquetCard';
import BouquetSheet from '@/MiniApps/Mailbox/Components/BouquetSheet';
import MailboxListPage from '@/MiniApps/Mailbox/Components/MailboxListPage';
import type { FlowerEntry } from '@/MiniApps/Mailbox/Components/NoteCard';
import type { HouseholdMember } from '@/MiniApps/Mailbox/Components/RecipientPicker';
import MailboxLayout from '@/MiniApps/Mailbox/Layouts/MailboxLayout';
import { destroy, index } from '@/routes/apps/our-exchange/flowers';
import type { Paginated } from '@/types/paginated';

type Tab = 'received' | 'sent';

type Props = {
    bouquets: Paginated<BouquetItem>;
    tab: Tab;
    catalog: FlowerEntry[];
    sort: 'recent' | 'oldest';
    q: string | null;
    members: HouseholdMember[];
};

export default function Flowers({
    bouquets,
    tab,
    catalog,
    sort,
    q,
    members,
}: Props) {
    const [bouquetOpen, setBouquetOpen] = useState(false);

    const handleDelete = (id: number) => {
        router.delete(destroy.url(id), {
            preserveScroll: true,
            ...mutationOptions({
                component: 'Mailbox/Flowers',
                action: 'bouquet.delete',
            }),
        });
    };

    const emptyCopy =
        tab === 'received'
            ? {
                  title: 'No flowers yet.',
                  body: 'When someone sends you flowers, you’ll see them here.',
              }
            : {
                  title: 'You haven’t sent flowers yet.',
                  body: 'Tap the plus button to arrange your first bouquet.',
              };

    return (
        <MailboxLayout>
            <MailboxListPage
                pageTitle="Flowers"
                paginator={bouquets}
                countAll={bouquets.counts?.all ?? bouquets.data.length}
                countNoun={{ one: 'flower', other: 'flowers' }}
                propName="bouquets"
                tab={tab}
                tabsAriaLabel="Flowers tabs"
                tabItems={[
                    { key: 'received', label: 'Received' },
                    { key: 'sent', label: 'Sent' },
                ]}
                tabHrefFor={(k) => index.url({ query: { tab: k } })}
                sort={sort}
                query={q}
                searchPlaceholder="Search flowers"
                fabAriaLabel="Send flowers"
                onFabClick={() => setBouquetOpen(true)}
                emptyIcon={Heart}
                emptyTitle={emptyCopy.title}
                emptyBody={emptyCopy.body}
                renderItem={(m, focusedId) => (
                    <BouquetCard
                        message={m}
                        onDelete={
                            m.is_mine ? () => handleDelete(m.id) : undefined
                        }
                        isFocused={focusedId === m.id}
                    />
                )}
            >
                <BouquetSheet
                    open={bouquetOpen}
                    onOpenChange={setBouquetOpen}
                    flowers={catalog}
                    members={members}
                />
            </MailboxListPage>
        </MailboxLayout>
    );
}
