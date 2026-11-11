import { Head } from '@inertiajs/react';
import { Flower2, Gavel, Mail, Ticket } from 'lucide-react';

import MailboxPinCard from '@/MiniApps/Mailbox/Components/MailboxPinCard';
import MailboxLayout from '@/MiniApps/Mailbox/Layouts/MailboxLayout';
import { index as challansIndex } from '@/routes/apps/our-mailbox/challans';
import { index as couponsIndex } from '@/routes/apps/our-mailbox/coupons';
import { index as flowersIndex } from '@/routes/apps/our-mailbox/flowers';
import { index as messagesIndex } from '@/routes/apps/our-mailbox/messages';
import Page from '@/Shell/Components/Page';
import AppLayout from '@/Shell/Layouts/AppLayout';

type Counts = {
    messages: number;
    challans: number;
    flowers: number;
    coupons: number;
};

type LatestUnreadPreview = {
    id: number;
    body: string;
    posted_at: string;
    sender_id: number;
};

type MailboxSummaryShared = {
    counts: Counts;
    unread_messages: number;
    challans_action_needed: number;
    coupons_action_needed: number;
    latest_unread_preview: LatestUnreadPreview | null;
    unread_flowers: number;
};

type Props = {
    mailboxSummary?: MailboxSummaryShared | null;
};

const EMPTY_COUNTS: Counts = {
    messages: 0,
    challans: 0,
    flowers: 0,
    coupons: 0,
};

export default function Landing({ mailboxSummary }: Props) {
    const counts = mailboxSummary?.counts ?? EMPTY_COUNTS;
    const unreadMessages = mailboxSummary?.unread_messages ?? 0;
    const challansActionNeeded = mailboxSummary?.challans_action_needed ?? 0;
    const couponsActionNeeded = mailboxSummary?.coupons_action_needed ?? 0;
    const latestUnreadPreview = mailboxSummary?.latest_unread_preview ?? null;
    const hasUnread = unreadMessages > 0;
    const unreadFlowers = mailboxSummary?.unread_flowers ?? 0;
    const hasUnreadFlowers = unreadFlowers > 0;

    return (
        <AppLayout>
            <Head title="Our Mailbox" />
            <MailboxLayout>
                <Page tier="index" title="Our Mailbox" backChevron>
                    <div className="mailbox-board">
                        <MailboxPinCard
                            icon={<Mail size={18} strokeWidth={1.75} />}
                            href={messagesIndex.url()}
                            title="Notes"
                            status={
                                hasUnread
                                    ? `${unreadMessages} unread`
                                    : 'nothing new. Write one?'
                            }
                            statusTone={hasUnread ? 'alert' : 'muted'}
                            preview={
                                hasUnread
                                    ? (latestUnreadPreview?.body ?? '').slice(
                                          0,
                                          140,
                                      )
                                    : undefined
                            }
                            ariaLabel="Open Notes"
                        />

                        <MailboxPinCard
                            icon={<Gavel size={18} strokeWidth={1.75} />}
                            href={challansIndex.url()}
                            title="Challans"
                            status={
                                challansActionNeeded > 0
                                    ? `${challansActionNeeded} need${
                                          challansActionNeeded === 1 ? 's' : ''
                                      } your action`
                                    : `${counts.challans} collected`
                            }
                            statusTone={
                                challansActionNeeded > 0 ? 'alert' : 'muted'
                            }
                            ariaLabel="Open Challans"
                        />

                        <MailboxPinCard
                            icon={<Flower2 size={18} strokeWidth={1.75} />}
                            href={flowersIndex.url()}
                            title="Flowers"
                            status={
                                hasUnreadFlowers
                                    ? `${unreadFlowers} unseen`
                                    : `${counts.flowers} ${
                                          counts.flowers === 1
                                              ? 'bouquet'
                                              : 'bouquets'
                                      } received`
                            }
                            statusTone={hasUnreadFlowers ? 'alert' : 'muted'}
                            ariaLabel="Open Flowers"
                        />

                        <MailboxPinCard
                            icon={<Ticket size={18} strokeWidth={1.75} />}
                            href={couponsIndex.url()}
                            title="Coupons"
                            status={
                                couponsActionNeeded > 0
                                    ? `${couponsActionNeeded} to fulfil`
                                    : `${counts.coupons} collected`
                            }
                            statusTone={
                                couponsActionNeeded > 0 ? 'alert' : 'muted'
                            }
                            ariaLabel="Open Coupons"
                        />
                    </div>
                </Page>
            </MailboxLayout>
        </AppLayout>
    );
}
