import { router } from '@inertiajs/react';
import { Image } from 'lucide-react';
import { useState } from 'react';

import { mutationOptions } from '@/lib/mutation';
import MailboxListPage from '@/MiniApps/Mailbox/Components/MailboxListPage';
import type { PostcardItem } from '@/MiniApps/Mailbox/Components/PostcardCard';
import PostcardCard from '@/MiniApps/Mailbox/Components/PostcardCard';
import type {
    Preset,
    SavedPrompt,
} from '@/MiniApps/Mailbox/Components/PostcardSheet';
import PostcardSheet from '@/MiniApps/Mailbox/Components/PostcardSheet';
import type { HouseholdMember } from '@/MiniApps/Mailbox/Components/RecipientPicker';
import MailboxLayout from '@/MiniApps/Mailbox/Layouts/MailboxLayout';
import { destroy, index } from '@/routes/apps/our-exchange/postcards';
import type { Paginated } from '@/types/paginated';

type Tab = 'received' | 'sent';

type Props = {
    postcards: Paginated<PostcardItem>;
    tab: Tab;
    tabCounts: Record<Tab, number>;
    presets: Preset[];
    savedPrompts: SavedPrompt[];
    sort: 'recent' | 'oldest';
    q: string | null;
    members: HouseholdMember[];
};

export default function Postcards({
    postcards,
    tab,
    tabCounts,
    presets,
    savedPrompts,
    sort,
    q,
    members,
}: Props) {
    const [postcardOpen, setPostcardOpen] = useState(false);

    const handleDelete = (id: number) => {
        router.delete(destroy.url(id), {
            preserveScroll: true,
            ...mutationOptions({
                component: 'Mailbox/Postcards',
                action: 'postcard.delete',
            }),
        });
    };

    const emptyCopy =
        tab === 'received'
            ? {
                  title: 'No postcards yet.',
                  body: 'When someone sends you a postcard, you’ll see it here.',
              }
            : {
                  title: 'You haven’t sent a postcard yet.',
                  body: 'Tap the plus button to make your first one.',
              };

    return (
        <MailboxLayout>
            <MailboxListPage
                pageTitle="Postcards"
                paginator={postcards}
                tabCounts={tabCounts}
                noun="postcards"
                propName="postcards"
                tab={tab}
                tabsAriaLabel="Postcards tabs"
                tabItems={[
                    { key: 'received', label: 'Received' },
                    { key: 'sent', label: 'Sent' },
                ]}
                tabHrefFor={(k) => index.url({ query: { tab: k } })}
                sort={sort}
                query={q}
                searchPlaceholder="Search postcards"
                fabAriaLabel="Send a postcard"
                onFabClick={() => setPostcardOpen(true)}
                emptyIcon={Image}
                emptyTitle={emptyCopy.title}
                emptyBody={emptyCopy.body}
                renderItem={(m, focusedId) => (
                    <PostcardCard
                        message={m}
                        onDelete={
                            m.is_mine ? () => handleDelete(m.id) : undefined
                        }
                        isFocused={focusedId === m.id}
                    />
                )}
            >
                <PostcardSheet
                    open={postcardOpen}
                    onOpenChange={setPostcardOpen}
                    presets={presets}
                    savedPrompts={savedPrompts}
                    members={members}
                />
            </MailboxListPage>
        </MailboxLayout>
    );
}
