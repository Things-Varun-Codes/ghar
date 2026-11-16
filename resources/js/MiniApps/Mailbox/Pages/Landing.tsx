import { Link } from '@inertiajs/react';
import { Flower2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useId } from 'react';

import { cn } from '@/lib/utils';
import MailboxLayout from '@/MiniApps/Mailbox/Layouts/MailboxLayout';
import { monogram } from '@/MiniApps/Mailbox/lib/monogram';
import { index as citationsIndex } from '@/routes/apps/our-mailbox/citations';
import { index as couponsIndex } from '@/routes/apps/our-mailbox/coupons';
import { index as flowersIndex } from '@/routes/apps/our-mailbox/flowers';
import { index as messagesIndex } from '@/routes/apps/our-mailbox/messages';
import EmptyState from '@/Shell/Components/EmptyState';
import Page from '@/Shell/Components/Page';

type Counts = {
    messages: number;
    citations: number;
    flowers: number;
    coupons: number;
};

type MailboxSummaryShared = {
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
    types?: string[];
    mailboxSummary?: MailboxSummaryShared | null;
    mailboxPeeks?: MailboxPeeks | null;
};

type Live = { text: string; alert: boolean };

const EMPTY_COUNTS: Counts = {
    messages: 0,
    citations: 0,
    flowers: 0,
    coupons: 0,
};

const MAX_PIPS = 10;

function plural(n: number, one: string, many: string): string {
    return `${n} ${n === 1 ? one : many}`;
}

function waiting(n: number, text: string): Live | null {
    return n > 0 ? { text: `${n} ${text}`, alert: true } : null;
}

function tally(n: number, one: string, many: string, empty: string): Live {
    return { text: n > 0 ? plural(n, one, many) : empty, alert: false };
}

function MailboxDoor({
    title,
    href,
    prefetch,
    live,
    peek,
}: {
    title: string;
    href: string;
    prefetch: boolean;
    live: Live;
    peek: ReactNode;
}) {
    const liveId = useId();

    return (
        <article className="mailbox-card mailbox-door shell-card-stretch shell-lift">
            <div className="mailbox-door-peek" aria-hidden="true">
                {peek}
            </div>
            <h2 className="mailbox-door-name">
                <Link
                    href={href}
                    // Notes and flowers mark themselves read when fetched: never prefetched.
                    prefetch={prefetch ? 'hover' : false}
                    aria-describedby={liveId}
                    className="shell-card-link"
                >
                    {title}
                </Link>
            </h2>
            <p
                id={liveId}
                className={cn(
                    'mailbox-door-live',
                    live.alert && 'mailbox-door-live--alert',
                )}
            >
                {live.text}
            </p>
        </article>
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

export default function Landing({
    types = [],
    mailboxSummary,
    mailboxPeeks,
}: Props) {
    const counts = mailboxSummary?.counts ?? EMPTY_COUNTS;

    return (
        <MailboxLayout>
            <Page title="Our Mailbox" documentTitle="Our Mailbox" backChevron>
                {types.length === 0 && (
                    <EmptyState
                        title="Nothing is switched on in the Mailbox"
                        body="An admin can turn on notes, flowers, coupons and citations."
                    />
                )}
                <div className="mailbox-doors">
                    {types.includes('messages') && (
                        <MailboxDoor
                            title="Notes"
                            href={messagesIndex.url()}
                            prefetch={false}
                            live={
                                waiting(
                                    mailboxSummary?.unread_messages ?? 0,
                                    'unread',
                                ) ??
                                tally(
                                    counts.messages,
                                    'note',
                                    'notes',
                                    'None yet. Write one?',
                                )
                            }
                            peek={
                                <NoteScrap note={mailboxPeeks?.notes ?? null} />
                            }
                        />
                    )}
                    {types.includes('flowers') && (
                        <MailboxDoor
                            title="Flowers"
                            href={flowersIndex.url()}
                            prefetch={false}
                            live={
                                waiting(
                                    mailboxSummary?.unread_flowers ?? 0,
                                    'unseen',
                                ) ??
                                tally(
                                    counts.flowers,
                                    'bouquet received',
                                    'bouquets received',
                                    'No bouquets yet',
                                )
                            }
                            peek={
                                <BouquetGlimpse
                                    bouquet={mailboxPeeks?.flowers ?? null}
                                />
                            }
                        />
                    )}
                    {types.includes('citations') && (
                        <MailboxDoor
                            title="Citations"
                            href={citationsIndex.url()}
                            prefetch
                            live={
                                waiting(
                                    mailboxSummary?.citations_action_needed ??
                                        0,
                                    'to pay',
                                ) ??
                                tally(
                                    counts.citations,
                                    'citation received',
                                    'citations received',
                                    'No citations yet',
                                )
                            }
                            peek={
                                <CitationSlice
                                    citation={mailboxPeeks?.citations ?? null}
                                />
                            }
                        />
                    )}
                    {types.includes('coupons') && (
                        <MailboxDoor
                            title="Coupons"
                            href={couponsIndex.url()}
                            prefetch
                            live={
                                waiting(
                                    mailboxSummary?.coupons_action_needed ?? 0,
                                    'to fulfil',
                                ) ??
                                tally(
                                    counts.coupons,
                                    'coupon received',
                                    'coupons received',
                                    'No coupons yet',
                                )
                            }
                            peek={
                                <CouponStub
                                    coupon={mailboxPeeks?.coupons ?? null}
                                />
                            }
                        />
                    )}
                </div>
            </Page>
        </MailboxLayout>
    );
}
