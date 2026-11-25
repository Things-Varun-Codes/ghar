import { router, usePage } from '@inertiajs/react';
import { Plus, ReceiptText } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useSheetSession } from '@/hooks/use-sheet-session';
import { formatInstant, formatPlainDate } from '@/lib/dates';
import { scrollBehavior } from '@/lib/motion';
import { mutationOptions } from '@/lib/mutation';
import { count } from '@/lib/plural';
import { cn } from '@/lib/utils';
import ExpenseDeleteDialog from '@/MiniApps/Mailbox/Components/ExpenseDeleteDialog';
import ExpenseGroupMenu from '@/MiniApps/Mailbox/Components/ExpenseGroupMenu';
import type { ExpenseGroupAbilities } from '@/MiniApps/Mailbox/Components/ExpenseGroupMenu';
import type { ExpenseGroup } from '@/MiniApps/Mailbox/Components/ExpenseGroupSheet';
import ExpenseSettleSheet from '@/MiniApps/Mailbox/Components/ExpenseSettleSheet';
import type { ExpensePayment } from '@/MiniApps/Mailbox/Components/ExpenseSettleSheet';
import ExpenseSheet from '@/MiniApps/Mailbox/Components/ExpenseSheet';
import type { ExpensePayload } from '@/MiniApps/Mailbox/Components/ExpenseSheet';
import MailboxLayout, {
    MAILBOX_ROOM,
} from '@/MiniApps/Mailbox/Layouts/MailboxLayout';
import { describeActivity } from '@/MiniApps/Mailbox/lib/expenseActivity';
import type { ExpenseActivity } from '@/MiniApps/Mailbox/lib/expenseActivity';
import { formatMoney } from '@/MiniApps/Mailbox/lib/money';
import { index, restore } from '@/routes/apps/our-exchange/expenses';
import { show } from '@/routes/apps/our-exchange/expenses/groups';
import CursorListBody from '@/Shell/Components/CursorListBody';
import EmptyState from '@/Shell/Components/EmptyState';
import Fab from '@/Shell/Components/Fab';
import ListNavBand from '@/Shell/Components/ListNavBand';
import Page from '@/Shell/Components/Page';
import PersonAvatar from '@/Shell/Components/PersonAvatar';
import SegmentedTabs from '@/Shell/Components/SegmentedTabs';
import SubmitButton from '@/Shell/Components/SubmitButton';
import { useListNavigation } from '@/Shell/Hooks/useListNavigation';
import type { Paginated } from '@/types/paginated';
import type { Person } from '@/types/person';

type Tab = 'expenses' | 'activity';

type Props = {
    group: ExpenseGroup & { can: ExpenseGroupAbilities };
    members: Person[];
    /* Everyone, for naming someone in the activity who has since left the group. */
    household: Person[];
    expenses: Paginated<ExpensePayload>;
    sort: string;
    q: string | null;
    /* The fewest payments that settle the group. */
    suggestions: ExpensePayment[];
    tab: Tab;
    activity: ExpenseActivity[] | null;
    focus: number | null;
};

const SORT_ITEMS = [
    { key: 'recent', label: 'Newest first' },
    { key: 'oldest', label: 'Oldest first' },
];

/* What the expense means for the viewer, in words: a signed figure never rests on colour. */
function viewerStake(expense: ExpensePayload, viewerId: number): string {
    const own =
        expense.shares.find((share) => share.user_id === viewerId)?.amount ?? 0;

    if (expense.paid_by_id === viewerId) {
        return expense.amount > own
            ? `you lent ${formatMoney(expense.amount - own)}`
            : 'all yours';
    }

    return own > 0 ? `you owe ${formatMoney(own)}` : 'not involved';
}

function RestoreButton({ expenseId }: { expenseId: number }) {
    const [pending, setPending] = useState(false);

    return (
        <SubmitButton
            type="button"
            variant="outline"
            size="sm"
            processing={pending}
            busyText="Restoring…"
            onClick={() =>
                router.patch(
                    restore.url(expenseId),
                    {},
                    {
                        preserveScroll: true,
                        ...mutationOptions({
                            component: 'Mailbox/ExpenseGroup',
                            action: 'expense.restore',
                            onPendingChange: setPending,
                        }),
                    },
                )
            }
            className="mailbox-btn-neutral"
        >
            Restore
        </SubmitButton>
    );
}

export default function ExpensesGroup({
    group,
    members,
    household,
    expenses,
    sort,
    q,
    suggestions,
    tab,
    activity,
    focus,
}: Props) {
    const viewerId = usePage().props.auth.user?.id ?? 0;
    const navigation = useListNavigation();
    const adding = useSheetSession<true>();
    const editing = useSheetSession<ExpensePayload>();
    const settling = useSheetSession<ExpensePayment>();
    const [deleting, setDeleting] = useState<ExpensePayload | null>(null);
    const canWrite = group.can.write;

    /* Mid-sentence: "you" for the viewer. */
    const who = (id: number) =>
        id === viewerId
            ? 'you'
            : (household.find((person) => person.id === id)?.name ?? 'someone');
    const Who = (id: number) => (id === viewerId ? 'You' : who(id));

    useEffect(() => {
        if (focus === null) {
            return;
        }

        const id = window.setTimeout(() => {
            const el = document.getElementById(`mailbox-expense-${focus}`);

            if (el) {
                el.scrollIntoView({
                    behavior: scrollBehavior(),
                    block: 'center',
                });
                el.focus({ preventScroll: true });
            }
        }, 100);

        return () => window.clearTimeout(id);
    }, [focus]);

    const renderExpense = (expense: ExpensePayload) => {
        const rowClass = cn(
            'mailbox-card mailbox-expense-item shell-card-stretch',
            expense.id === focus && 'focused',
        );
        const date = formatPlainDate(expense.spent_on);

        if (expense.is_settlement) {
            const line = `${Who(expense.paid_by_id)} paid ${who(expense.shares[0]?.user_id ?? 0)} ${formatMoney(expense.amount)}`;

            return (
                <article
                    id={`mailbox-expense-${expense.id}`}
                    tabIndex={-1}
                    className={cn(rowClass, 'mailbox-expense-item--payment')}
                >
                    <div className="mailbox-expense-item-main">
                        <span>{line}</span>
                        <span className="mailbox-expense-meta">
                            Payment · {date}
                        </span>
                    </div>
                    {canWrite && (
                        <SubmitButton
                            type="button"
                            variant="outline"
                            size="sm"
                            busyText="Deleting…"
                            onClick={() => setDeleting(expense)}
                            aria-label={`Delete payment: ${line}`}
                            className="mailbox-btn-neutral mailbox-btn-danger"
                        >
                            Delete
                        </SubmitButton>
                    )}
                </article>
            );
        }

        return (
            <article
                id={`mailbox-expense-${expense.id}`}
                tabIndex={-1}
                className={cn(rowClass, canWrite && 'shell-lift')}
            >
                <div className="mailbox-expense-item-main">
                    {canWrite ? (
                        <button
                            type="button"
                            className="shell-card-link mailbox-expense-title"
                            onClick={() => editing.show(expense)}
                        >
                            {expense.title}
                        </button>
                    ) : (
                        <span className="mailbox-expense-title">
                            {expense.title}
                        </span>
                    )}
                    <span className="mailbox-expense-meta">
                        {date} · {Who(expense.paid_by_id)} paid{' '}
                        {formatMoney(expense.amount)}
                    </span>
                </div>
                <span className="mailbox-expense-stake">
                    {viewerStake(expense, viewerId)}
                </span>
            </article>
        );
    };

    const tabs = (
        <SegmentedTabs
            mode="nav"
            keepScroll
            prefetch
            ariaLabel="Group tabs"
            active={tab}
            items={[
                { key: 'expenses', label: 'Expenses' },
                { key: 'activity', label: 'Activity' },
            ]}
            hrefFor={(key) =>
                show.url(
                    group.id,
                    key === 'activity' ? { query: { tab: key } } : undefined,
                )
            }
        />
    );

    return (
        <MailboxLayout>
            <Page
                title={group.name}
                room={MAILBOX_ROOM}
                back={{ href: index.url(), label: 'Expenses' }}
                actions={
                    <ExpenseGroupMenu
                        group={group}
                        household={household}
                        viewerId={viewerId}
                    />
                }
                fab={
                    canWrite ? (
                        <Fab
                            onClick={() => adding.show(true)}
                            ariaLabel="Add expense"
                            icon={
                                <Plus
                                    aria-hidden="true"
                                    size={24}
                                    strokeWidth={2.5}
                                />
                            }
                        />
                    ) : undefined
                }
            >
                <div className="mailbox-expense-page">
                    {group.archived && (
                        <p className="mailbox-expense-quiet">
                            This group is archived: nothing in it can change
                            until someone unarchives it.
                        </p>
                    )}

                    <section aria-labelledby="expense-group-balances">
                        <h2
                            id="expense-group-balances"
                            className="mailbox-expense-heading"
                        >
                            To settle up
                        </h2>
                        {suggestions.length === 0 ? (
                            <p className="mailbox-expense-quiet">
                                All settled. Nobody owes anybody here.
                            </p>
                        ) : (
                            <ul className="mailbox-card mailbox-expense-rows">
                                {suggestions.map((payment) => {
                                    const from = household.find(
                                        (person) =>
                                            person.id === payment.from_id,
                                    );

                                    return (
                                        <li
                                            key={`${payment.from_id}-${payment.to_id}`}
                                            className="mailbox-expense-row"
                                        >
                                            {from && (
                                                <PersonAvatar
                                                    person={from}
                                                    size={32}
                                                />
                                            )}
                                            <span className="mailbox-expense-row-main">
                                                {Who(payment.from_id)}{' '}
                                                {payment.from_id === viewerId
                                                    ? 'pay'
                                                    : 'pays'}{' '}
                                                {who(payment.to_id)}{' '}
                                                {formatMoney(payment.amount)}
                                            </span>
                                            {canWrite && (
                                                <SubmitButton
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    busyText="Recording…"
                                                    onClick={() =>
                                                        settling.show(payment)
                                                    }
                                                    aria-label={`Record payment from ${who(payment.from_id)} to ${who(payment.to_id)}`}
                                                    className="mailbox-btn-neutral"
                                                >
                                                    Record payment
                                                </SubmitButton>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>
                </div>

                {tab === 'expenses' ? (
                    <ListNavBand
                        navigating={navigation.navigating}
                        count={
                            <span className="text-(length:--text-body) text-(--mailbox-ink-soft)">
                                {count(
                                    expenses.counts?.all ??
                                        expenses.data.length,
                                    'entry',
                                    'entries',
                                )}
                            </span>
                        }
                        sort={sort}
                        sortItems={SORT_ITEMS}
                        onSortSelect={(key) =>
                            navigation.navigate({ sort: key })
                        }
                        query={q ?? ''}
                        searchPlaceholder="Search expenses"
                        onSearch={(value) => navigation.navigate({ q: value })}
                        tabs={tabs}
                    />
                ) : (
                    <div className="list-nav-band-tabs">{tabs}</div>
                )}

                {tab === 'expenses' ? (
                    <CursorListBody
                        prop="expenses"
                        items={expenses.data}
                        navigation={navigation}
                        query={q ?? ''}
                        noMatchesNoun="expenses"
                        noMatchesBody="Try another word, or clear the search to see everything."
                        empty={
                            <EmptyState
                                icon={ReceiptText}
                                title="Nothing to split yet."
                                body={
                                    canWrite
                                        ? 'Tap the plus button to add the first expense.'
                                        : undefined
                                }
                            />
                        }
                        renderItem={renderExpense}
                        listClassName="mailbox-feed mailbox-expense-feed"
                    />
                ) : (
                    <ul className="mailbox-expense-activity">
                        {(activity ?? []).map((entry) => (
                            <li key={entry.id} className="mailbox-expense-row">
                                <PersonAvatar person={entry.actor} size={32} />
                                <div className="mailbox-expense-row-main">
                                    <p className="m-0">
                                        {describeActivity(entry, who)}
                                    </p>
                                    <p className="mailbox-expense-meta m-0">
                                        {formatInstant(entry.at, {
                                            intl: {
                                                day: 'numeric',
                                                month: 'short',
                                                hour: 'numeric',
                                                minute: '2-digit',
                                            },
                                        })}
                                    </p>
                                </div>
                                {entry.can_restore &&
                                    entry.expense_id !== null && (
                                        <RestoreButton
                                            expenseId={entry.expense_id}
                                        />
                                    )}
                            </li>
                        ))}
                    </ul>
                )}
            </Page>

            {adding.value && (
                <ExpenseSheet
                    key={adding.key}
                    open={adding.open}
                    onOpenChange={adding.onOpenChange}
                    groupId={group.id}
                    members={members}
                    viewerId={viewerId}
                />
            )}

            {editing.value && (
                <ExpenseSheet
                    key={editing.key}
                    open={editing.open}
                    onOpenChange={editing.onOpenChange}
                    groupId={group.id}
                    members={members}
                    viewerId={viewerId}
                    expense={editing.value}
                />
            )}

            {settling.value && (
                <ExpenseSettleSheet
                    key={settling.key}
                    open={settling.open}
                    onOpenChange={settling.onOpenChange}
                    groupId={group.id}
                    members={members}
                    payment={settling.value}
                />
            )}

            {deleting && (
                <ExpenseDeleteDialog
                    expense={deleting}
                    open
                    onOpenChange={(open) => !open && setDeleting(null)}
                />
            )}
        </MailboxLayout>
    );
}
