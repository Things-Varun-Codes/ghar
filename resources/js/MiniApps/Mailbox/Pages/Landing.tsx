import { Flower2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Settle } from '@/components/motion';
import { count } from '@/lib/plural';

import { cn } from '@/lib/utils';
import MailboxLayout, {
    MAILBOX_ROOM,
} from '@/MiniApps/Mailbox/Layouts/MailboxLayout';
import { monogram } from '@/MiniApps/Mailbox/lib/monogram';
import { index as citationsIndex } from '@/routes/apps/our-exchange/citations';
import { index as couponsIndex } from '@/routes/apps/our-exchange/coupons';
import { index as flowersIndex } from '@/routes/apps/our-exchange/flowers';
import { index as messagesIndex } from '@/routes/apps/our-exchange/messages';
import EmptyState from '@/Shell/Components/EmptyState';
import Page from '@/Shell/Components/Page';
import RoomDoor from '@/Shell/Components/RoomDoor';

type EntryType = 'messages' | 'flowers' | 'citations' | 'coupons';

type Counts = Record<EntryType, number>;

type MailboxSummary = {
    counts: Counts;
    unread_messages: number;
    unread_flowers: number;
    citations_action_needed: number;
    coupons_action_needed: number;
};

type NotePeek = { body: string; from: string };
type BouquetPeek = { image_url: string; from: string };
type CitationPeek = {
    ref_no: string | null;
    status: 'issued' | 'paid';
    offence: string;
    issuer: string;
    recipient: string;
};
type CouponPeek = {
    title: string;
    remaining: number;
    quantity: number;
    status: 'issued' | 'requested' | 'depleted';
    is_expired: boolean;
    issuer: string;
    recipient: string;
};

type MailboxPeeks = {
    notes: NotePeek | null;
    flowers: BouquetPeek | null;
    citations: CitationPeek | null;
    coupons: CouponPeek | null;
};

type Props = {
    /* The entry types switched on, in landing order. */
    types: { key: EntryType; label: string }[];
    mailboxSummary: MailboxSummary;
    mailboxPeeks: MailboxPeeks;
};

type Live = { text: string; alert: boolean };

type Door = {
    href: string;
    prefetch: boolean;
    live: Live;
    peek: ReactNode;
};

const MAX_PIPS = 10;

function waiting(n: number, text: string): Live | null {
    return n > 0 ? { text: `${n} ${text}`, alert: true } : null;
}

function tally(n: number, one: string, many: string, empty: string): Live {
    return { text: n > 0 ? count(n, one, many) : empty, alert: false };
}

function MailboxDoor({
    title,
    href,
    prefetch,
    live,
    peek,
    index,
}: Door & { title: string; index: number }) {
    return (
        <RoomDoor
            href={href}
            // Notes and flowers mark themselves read when fetched: never prefetched.
            prefetch={prefetch ? 'hover' : false}
            name={title}
            settleIndex={index}
            peek={peek}
            live={live.text}
            className="mailbox-card mailbox-door"
            peekClassName="mailbox-door-peek"
            nameClassName="mailbox-door-name"
            liveClassName={cn(
                'mailbox-door-live',
                live.alert && 'mailbox-door-live--alert',
            )}
        />
    );
}

function NoteScrap({ note }: { note: NotePeek | null }) {
    return (
        <div className="mailbox-door-note">
            {note ? (
                <>
                    <p className="mailbox-door-note-body">{note.body}</p>
                    <p className="mailbox-door-note-from">From {note.from}</p>
                </>
            ) : (
                <p className="mailbox-door-note-from">Nothing to read yet</p>
            )}
        </div>
    );
}

function BouquetGlimpse({ bouquet }: { bouquet: BouquetPeek | null }) {
    if (!bouquet) {
        return (
            <span className="mailbox-door-empty">
                <Flower2 size={28} strokeWidth={1.5} />
            </span>
        );
    }

    return (
        <img
            src={bouquet.image_url}
            alt=""
            loading="lazy"
            decoding="async"
            className="mailbox-door-bouquet"
        />
    );
}

function CitationSlice({ citation }: { citation: CitationPeek | null }) {
    return (
        <div className="mailbox-door-citation">
            <div className="mailbox-citation-masthead">
                <div className="mailbox-citation-seal">
                    <span className="mailbox-citation-monogram">
                        {citation
                            ? monogram(citation.issuer, citation.recipient)
                            : 'OC'}
                    </span>
                </div>
                <div className="min-w-0">
                    <div className="mailbox-citation-title">
                        Department of the Household
                    </div>
                    <div className="mailbox-citation-sub">
                        {citation?.ref_no ?? 'Citations registry'}
                    </div>
                </div>
            </div>
            {citation && (
                <>
                    <p className="mailbox-written mailbox-door-citation-offence">
                        {citation.offence}
                    </p>
                    <div
                        className={`mailbox-citation-stamp mailbox-citation-stamp--${citation.status}`}
                    >
                        {citation.status === 'paid' ? 'Paid' : 'Issued'}
                    </div>
                </>
            )}
        </div>
    );
}

function couponStamp(coupon: CouponPeek): {
    label: string;
    tone: string;
} | null {
    if (coupon.status === 'requested') {
        return { label: 'Requested', tone: 'requested' };
    }

    if (coupon.status === 'depleted') {
        return { label: 'Redeemed', tone: 'depleted' };
    }

    if (coupon.is_expired) {
        return { label: 'Expired', tone: 'expired' };
    }

    return null;
}

function CouponStub({ coupon }: { coupon: CouponPeek | null }) {
    if (!coupon) {
        return (
            <div className="mailbox-door-coupon">
                <span className="mailbox-door-coupon-foot">
                    <span>Nothing to redeem yet</span>
                </span>
            </div>
        );
    }

    const stamp = couponStamp(coupon);
    const pips = Math.min(coupon.quantity, MAX_PIPS);
    const redeemed = coupon.quantity - coupon.remaining;

    return (
        <div className="mailbox-door-coupon">
            <span className="mailbox-door-coupon-title">{coupon.title}</span>
            <span className="mailbox-door-coupon-foot">
                <span className="mailbox-coupon-pips">
                    {Array.from({ length: pips }, (_, i) => (
                        <span
                            key={i}
                            className={cn(
                                'mailbox-coupon-pip',
                                i < redeemed && 'is-checked',
                            )}
                        />
                    ))}
                </span>
                <span className="tabular-nums">
                    {coupon.remaining} of {coupon.quantity} left
                </span>
                {stamp && (
                    <span
                        className={`mailbox-coupon-stamp mailbox-coupon-stamp--${stamp.tone}`}
                    >
                        {stamp.label}
                    </span>
                )}
            </span>
        </div>
    );
}

const DOORS: Record<
    EntryType,
    (summary: MailboxSummary, peeks: MailboxPeeks) => Door
> = {
    messages: (summary, peeks) => ({
        href: messagesIndex.url(),
        prefetch: false,
        live:
            waiting(summary.unread_messages, 'unread') ??
            tally(
                summary.counts.messages,
                'note',
                'notes',
                'None yet. Write one?',
            ),
        peek: <NoteScrap note={peeks.notes} />,
    }),
    flowers: (summary, peeks) => ({
        href: flowersIndex.url(),
        prefetch: false,
        live:
            waiting(summary.unread_flowers, 'unseen') ??
            tally(
                summary.counts.flowers,
                'bouquet received',
                'bouquets received',
                'No bouquets yet',
            ),
        peek: <BouquetGlimpse bouquet={peeks.flowers} />,
    }),
    citations: (summary, peeks) => ({
        href: citationsIndex.url(),
        prefetch: true,
        live:
            waiting(summary.citations_action_needed, 'to pay') ??
            tally(
                summary.counts.citations,
                'citation received',
                'citations received',
                'No citations yet',
            ),
        peek: <CitationSlice citation={peeks.citations} />,
    }),
    coupons: (summary, peeks) => ({
        href: couponsIndex.url(),
        prefetch: true,
        live:
            waiting(summary.coupons_action_needed, 'to fulfil') ??
            tally(
                summary.counts.coupons,
                'coupon received',
                'coupons received',
                'No coupons yet',
            ),
        peek: <CouponStub coupon={peeks.coupons} />,
    }),
};

export default function Landing({
    types,
    mailboxSummary,
    mailboxPeeks,
}: Props) {
    return (
        <MailboxLayout>
            <Page title={MAILBOX_ROOM} documentTitle={MAILBOX_ROOM} backChevron>
                {types.length === 0 && (
                    <EmptyState
                        title="Nothing is switched on in the Exchange"
                        body="An admin can turn on notes, flowers, coupons and citations."
                    />
                )}
                <div className="mailbox-doors">
                    <Settle>
                        {types.map(({ key, label }, index) => (
                            <MailboxDoor
                                key={key}
                                title={label}
                                index={index}
                                {...DOORS[key](mailboxSummary, mailboxPeeks)}
                            />
                        ))}
                    </Settle>
                </div>
            </Page>
        </MailboxLayout>
    );
}
