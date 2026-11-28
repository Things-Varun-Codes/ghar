import { Link, usePage } from '@inertiajs/react';
import { ChevronRight, HandCoins, Plus, ReceiptText } from 'lucide-react';
import { useEffect, useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { useSheetSession } from '@/hooks/use-sheet-session';
import { formatPlainDate } from '@/lib/dates';
import { scrollBehavior } from '@/lib/motion';
import { cn } from '@/lib/utils';
import ExpenseActivityList from '@/MiniApps/Mailbox/Components/ExpenseActivityList';
import ExpenseFaces from '@/MiniApps/Mailbox/Components/ExpenseFaces';
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
import type { ExpenseActivity } from '@/MiniApps/Mailbox/lib/expenseActivity';
import { NO_CATEGORY_ICON } from '@/MiniApps/Mailbox/lib/expenseCategories';
import type { ExpenseCategory } from '@/MiniApps/Mailbox/lib/expenseCategories';
import { formatMoney } from '@/MiniApps/Mailbox/lib/money';
import {
    index,
    show as showExpense,
} from '@/routes/apps/our-exchange/expenses';
import { show } from '@/routes/apps/our-exchange/expenses/groups';
import CursorListBody from '@/Shell/Components/CursorListBody';
import EmptyState from '@/Shell/Components/EmptyState';
import Fab from '@/Shell/Components/Fab';
import ListNavBand from '@/Shell/Components/ListNavBand';
import Page from '@/Shell/Components/Page';
import PersonAvatar from '@/Shell/Components/PersonAvatar';
import SegmentedTabs from '@/Shell/Components/SegmentedTabs';
import { useListNavigation } from '@/Shell/Hooks/useListNavigation';
import LinkableIcon from '@/Shell/linkables/LinkableIcon';
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
    categories: ExpenseCategory[];
    /* The keys this group's expenses have: what the filter offers. */
    used_categories: string[];
    /* A key, "none" or null for all. */
    category: string | null;
    /* Minor units: what the group spent, repayments aside, and the viewer's share of it. */
    totals: { spent: number; yours: number };
    /* Each person's balance in the group: positive when they are owed. */
    nets: { user_id: number; net: number }[];
    /* The fewest payments that settle the group. */
    suggestions: ExpensePayment[];
    tab: Tab;
    activity: ExpenseActivity[] | null;
    focus: number | null;
};

const ALL = 'all';

const SORT_ITEMS = [
    { key: 'recent', label: 'Newest first' },
    { key: 'oldest', label: 'Oldest first' },
];

/* The viewer's part of one expense. What they owe overall is the slip's to say, not a line's. */
function ViewerShare({
    expense,
    viewerId,
}: {
    expense: ExpensePayload;
    viewerId: number;
}) {
    const own =
        expense.shares.find((share) => share.user_id === viewerId)?.amount ?? 0;

    return (
        <span className="mailbox-expense-words">
            {own === 0
                ? 'not involved'
                : own === expense.amount
                  ? 'all yours'
                  : `your share ${formatMoney(own)}`}
        </span>
    );
}

/* The day and month, and the year only when it isn't this one. */
function shortDate(date: string, today: string): string {
    return formatPlainDate(date, {
        intl:
            date.slice(0, 4) === today.slice(0, 4)
                ? { day: 'numeric', month: 'short' }
                : { day: 'numeric', month: 'short', year: 'numeric' },
    });
}

export default function ExpensesGroup({
    group,
    members,
    household,
    expenses,
    sort,
    q,
    categories,
    used_categories: usedCategories,
    category: categoryFilter,
    nets,
    totals,
    suggestions,
    tab,
    activity,
    focus,
}: Props) {
    const { auth, today } = usePage().props;
    const viewerId = auth.user?.id ?? 0;
    const navigation = useListNavigation();
    const adding = useSheetSession<true>();
    const categoryHistory = useMemo(
        () =>
            expenses.data.flatMap((expense) =>
                expense.category
                    ? [
                          {
                              title: expense.title,
                              categoryId: expense.category,
                              at: Date.parse(expense.created_at),
                          },
                      ]
                    : [],
            ),
        [expenses.data],
    );
    /* The first entry of each month as listed: it carries the month's heading. */
    const monthStarts = useMemo(
        () =>
            new Set(
                expenses.data
                    .filter(
                        (expense, at) =>
                            expense.spent_on.slice(0, 7) !==
                            expenses.data[at - 1]?.spent_on.slice(0, 7),
                    )
                    .map((expense) => expense.id),
            ),
        [expenses.data],
    );
    const settling = useSheetSession<ExpensePayment>();
    const canWrite = group.can.write;
    const net = nets.find((entry) => entry.user_id === viewerId)?.net ?? 0;
    /* The payments the viewer makes or receives: what others owe each other isn't theirs to see here. */
    const own = suggestions.filter(
        (payment) => payment.from_id === viewerId || payment.to_id === viewerId,
    );

    /* Mid-sentence: "you" for the viewer. */
    const who = (id: number) =>
        id === viewerId
            ? 'you'
            : (household.find((person) => person.id === id)?.name ?? 'someone');
    const Who = (id: number) => (id === viewerId ? 'You' : who(id));
    const categoryLabel = (key: string | null) =>
        categories.find((item) => item.key === key)?.label ?? 'none';

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

    const renderEntry = (expense: ExpensePayload) => {
        const category = categories.find(
            (item) => item.key === expense.category,
        );
        const date = shortDate(expense.spent_on, today);

        return (
            <article
                id={`mailbox-expense-${expense.id}`}
                tabIndex={-1}
                className={cn(
                    'mailbox-expense-item shell-card-stretch',
                    expense.is_settlement && 'mailbox-expense-item--payment',
                    expense.id === focus && 'focused',
                )}
            >
                <span className="mailbox-expense-icon">
                    {expense.is_settlement ? (
                        <HandCoins aria-hidden="true" strokeWidth={1.5} />
                    ) : (
                        <LinkableIcon
                            name={category?.icon ?? NO_CATEGORY_ICON}
                            size={22}
                            aria-hidden="true"
                            strokeWidth={1.5}
                        />
                    )}
                    {category && (
                        <span className="sr-only">{category.label}: </span>
                    )}
                </span>
                <div className="mailbox-expense-item-main">
                    <Link
                        href={showExpense.url(expense.id)}
                        prefetch="hover"
                        className="shell-card-link mailbox-expense-title"
                    >
                        {expense.is_settlement
                            ? `${Who(expense.paid_by_id)} paid ${who(expense.shares[0]?.user_id ?? 0)}`
                            : expense.title}
                    </Link>
                    <span className="mailbox-expense-meta">
                        {date} ·{' '}
                        {expense.is_settlement
                            ? 'Repayment'
                            : `${Who(expense.paid_by_id)} paid`}
                    </span>
                </div>
                <span className="mailbox-expense-figure">
                    <strong className="mailbox-expense-amount">
                        {formatMoney(expense.amount)}
                    </strong>
                    {!expense.is_settlement && (
                        <ViewerShare expense={expense} viewerId={viewerId} />
                    )}
                </span>
                <ChevronRight
                    aria-hidden="true"
                    size={16}
                    strokeWidth={1.5}
                    className="mailbox-expense-chevron"
                />
            </article>
        );
    };

    const renderExpense = (expense: ExpensePayload) => (
        <>
            {monthStarts.has(expense.id) && (
                <h3 className="mailbox-expense-month">
                    {formatPlainDate(expense.spent_on, {
                        intl:
                            expense.spent_on.slice(0, 4) === today.slice(0, 4)
                                ? { month: 'long' }
                                : { month: 'long', year: 'numeric' },
                    })}
                </h3>
            )}
            {renderEntry(expense)}
        </>
    );

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
                tabs={tabs}
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
                <div className="mailbox-expense-layout" data-tab={tab}>
                    <section
                        className="mailbox-expense-aside mailbox-slip"
                        aria-labelledby="expense-group-standing"
                    >
                        <div className="mailbox-slip-paper">
                            <div className="mailbox-slip-head">
                                <ExpenseFaces
                                    people={household.filter((person) =>
                                        group.member_ids.includes(person.id),
                                    )}
                                    total={group.member_ids.length}
                                />
                                <ExpenseGroupMenu
                                    group={group}
                                    household={household}
                                    viewerId={viewerId}
                                />
                            </div>

                            <h2
                                id="expense-group-standing"
                                className="mailbox-expense-summary"
                            >
                                {totals.spent === 0 &&
                                suggestions.length === 0 ? (
                                    'Nothing spent yet.'
                                ) : net === 0 ? (
                                    suggestions.length === 0 ? (
                                        'Everyone is settled up.'
                                    ) : (
                                        'You are settled up.'
                                    )
                                ) : (
                                    <>
                                        {net > 0 ? 'You are owed' : 'You owe'}{' '}
                                        <strong
                                            className="mailbox-expense-amount"
                                            data-direction={
                                                net > 0 ? 'in' : 'out'
                                            }
                                        >
                                            {formatMoney(Math.abs(net))}
                                        </strong>
                                    </>
                                )}
                            </h2>

                            {group.archived && (
                                <p className="mailbox-expense-quiet">
                                    This group is archived: nothing in it can
                                    change until someone unarchives it.
                                </p>
                            )}

                            {own.length > 0 ? (
                                <ul
                                    className="mailbox-slip-lines"
                                    aria-label="To settle up"
                                >
                                    {own.map((payment) => {
                                        const from = household.find(
                                            (person) =>
                                                person.id === payment.from_id,
                                        );

                                        return (
                                            <li
                                                key={`${payment.from_id}-${payment.to_id}`}
                                            >
                                                {from && (
                                                    <PersonAvatar
                                                        person={from}
                                                        size={24}
                                                    />
                                                )}
                                                <span className="mailbox-expense-row-main">
                                                    {Who(payment.from_id)}{' '}
                                                    {payment.from_id ===
                                                    viewerId
                                                        ? 'pay'
                                                        : 'pays'}{' '}
                                                    {who(payment.to_id)}
                                                </span>
                                                <strong
                                                    className="mailbox-expense-amount"
                                                    data-direction={
                                                        payment.to_id ===
                                                        viewerId
                                                            ? 'in'
                                                            : payment.from_id ===
                                                                viewerId
                                                              ? 'out'
                                                              : undefined
                                                    }
                                                >
                                                    {formatMoney(
                                                        payment.amount,
                                                    )}
                                                </strong>
                                                {canWrite && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            settling.show(
                                                                payment,
                                                            )
                                                        }
                                                        aria-label={`Mark paid: ${who(payment.from_id)} ${payment.from_id === viewerId ? 'pay' : 'pays'} ${who(payment.to_id)}`}
                                                        className="mailbox-btn-neutral"
                                                    >
                                                        Mark paid
                                                    </Button>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                totals.spent > 0 &&
                                suggestions.length === 0 && (
                                    <span className="mailbox-coupon-stamp mailbox-expense-stamp">
                                        Settled
                                    </span>
                                )
                            )}

                            {totals.spent > 0 && (
                                <dl className="mailbox-slip-totals">
                                    <div>
                                        <dt>Spent together</dt>
                                        <dd>{formatMoney(totals.spent)}</dd>
                                    </div>
                                    <div>
                                        <dt>Your share</dt>
                                        <dd>{formatMoney(totals.yours)}</dd>
                                    </div>
                                </dl>
                            )}
                        </div>
                    </section>

                    <div className="mailbox-expense-main">
                        {/* Nothing to search or sort in a group with nothing in it. */}
                        {tab === 'expenses' &&
                        (expenses.data.length > 0 ||
                            q ||
                            categoryFilter !== null) ? (
                            <ListNavBand
                                navigating={navigation.navigating}
                                sort={sort}
                                sortItems={SORT_ITEMS}
                                onSortSelect={(key) =>
                                    navigation.navigate({ sort: key })
                                }
                                query={q ?? ''}
                                searchPlaceholder="Search expenses"
                                onSearch={(value) =>
                                    navigation.navigate({ q: value })
                                }
                                filter={categoryFilter ?? ALL}
                                filterLabel="Category"
                                filterItems={
                                    usedCategories.length > 0
                                        ? [
                                              {
                                                  key: ALL,
                                                  label: 'All categories',
                                              },
                                              ...categories
                                                  .filter((item) =>
                                                      usedCategories.includes(
                                                          item.key,
                                                      ),
                                                  )
                                                  .map(({ key, label }) => ({
                                                      key,
                                                      label,
                                                  })),
                                              {
                                                  key: 'none',
                                                  label: 'No category',
                                              },
                                          ]
                                        : undefined
                                }
                                onFilterSelect={(key) =>
                                    navigation.navigate({
                                        category: key === ALL ? undefined : key,
                                    })
                                }
                            />
                        ) : null}

                        {tab === 'expenses' && (
                            <h2 className="sr-only">Expenses</h2>
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
                                    categoryFilter !== null ? (
                                        <EmptyState
                                            icon={ReceiptText}
                                            title="Nothing here in this category."
                                            body="Choose All categories to see every expense."
                                        />
                                    ) : (
                                        <EmptyState
                                            icon={ReceiptText}
                                            title="Nothing to split yet."
                                            body={
                                                canWrite
                                                    ? 'Tap the plus button to add the first expense.'
                                                    : undefined
                                            }
                                        />
                                    )
                                }
                                renderItem={renderExpense}
                                listClassName="mailbox-card mailbox-expense-rows mailbox-expense-feed"
                            />
                        ) : (
                            <ExpenseActivityList
                                entries={activity ?? []}
                                who={who}
                                categoryLabel={categoryLabel}
                            />
                        )}
                    </div>
                </div>
            </Page>

            {adding.value && (
                <ExpenseSheet
                    key={adding.key}
                    open={adding.open}
                    onOpenChange={adding.onOpenChange}
                    groupId={group.id}
                    members={members}
                    viewerId={viewerId}
                    categories={categories}
                    categoryHistory={categoryHistory}
                />
            )}

            {settling.value && (
                <ExpenseSettleSheet
                    key={settling.key}
                    open={settling.open}
                    onOpenChange={settling.onOpenChange}
                    groupId={group.id}
                    members={members}
                    viewerId={viewerId}
                    payment={settling.value}
                />
            )}
        </MailboxLayout>
    );
}
