import { router } from '@inertiajs/react';
import { Heart } from 'lucide-react';
import { useState } from 'react';

import ComposerSheet from '@/MiniApps/Mailbox/Components/ComposerSheet';
import MailboxListPage from '@/MiniApps/Mailbox/Components/MailboxListPage';
import NoteCard from '@/MiniApps/Mailbox/Components/NoteCard';
import type { MessageItem } from '@/MiniApps/Mailbox/Components/NoteCard';
import type { HouseholdMember } from '@/MiniApps/Mailbox/Components/RecipientPicker';
import MailboxLayout from '@/MiniApps/Mailbox/Layouts/MailboxLayout';
import { destroy, index } from '@/routes/apps/our-mailbox/messages';
import AppLayout from '@/Shell/Layouts/AppLayout';
import type { Paginated } from '@/types/paginated';

type Tab = 'received' | 'sent';

type Props = {
    messages: Paginated<MessageItem>;
    tab: Tab;
    sort: 'recent' | 'oldest';
    q: string | null;
    members: HouseholdMember[];
};

export default function Messages({ messages, tab, sort, q, members }: Props) {
    const [composerOpen, setComposerOpen] = useState(false);

    const handleDelete = (id: number) => {
        router.delete(destroy.url(id), {
            preserveScroll: true,
            preserveState: false,
        });
    };

    const emptyCopy =
        tab === 'received'
            ? {
                  title: 'No notes yet.',
                  body: 'When someone writes you a note, you’ll see it here.',
              }
            : {
                  title: 'You haven’t written yet.',
                  body: 'Tap the plus button to write your first note.',
              };

    return (
        <AppLayout>
            <MailboxLayout>
                <MailboxListPage
                    headTitle="Messages"
                    pageTitle="Notes"
                    paginator={messages}
                    countAll={messages.counts?.all ?? messages.data.length}
                    countNoun={{ one: 'note', other: 'notes' }}
                    propName="messages"
                    tab={tab}
                    tabsAriaLabel="Message tabs"
                    tabItems={[
                        { key: 'received', label: 'Received' },
                        { key: 'sent', label: 'Sent' },
                    ]}
                    tabHrefFor={(k) => index.url({ query: { tab: k } })}
                    sort={sort}
                    query={q}
                    searchPlaceholder="Search notes"
                    fabAriaLabel="Write a note"
                    onFabClick={() => setComposerOpen(true)}
                    emptyIcon={Heart}
                    emptyTitle={emptyCopy.title}
                    emptyBody={emptyCopy.body}
                    itemGap={16}
                    renderItem={(m, focusedId) => (
                        <NoteCard
                            key={m.id}
                            message={m}
                            onDelete={
                                m.is_mine ? () => handleDelete(m.id) : undefined
                            }
                            isFocused={focusedId === m.id}
                        />
                    )}
                >
                    <ComposerSheet
                        open={composerOpen}
                        onOpenChange={setComposerOpen}
                        members={members}
                    />
                </MailboxListPage>
            </MailboxLayout>
        </AppLayout>
    );
}
