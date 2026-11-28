import { usePage } from '@inertiajs/react';
import { HandCoins, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSheetSession } from '@/hooks/use-sheet-session';
import { formatPlainDate } from '@/lib/dates';
import ExpenseActivityList from '@/MiniApps/Mailbox/Components/ExpenseActivityList';
import ExpenseDeleteDialog from '@/MiniApps/Mailbox/Components/ExpenseDeleteDialog';
import ExpenseSheet from '@/MiniApps/Mailbox/Components/ExpenseSheet';
import type { ExpensePayload } from '@/MiniApps/Mailbox/Components/ExpenseSheet';
import MailboxLayout, {
    MAILBOX_ROOM,
} from '@/MiniApps/Mailbox/Layouts/MailboxLayout';
import type { ExpenseActivity } from '@/MiniApps/Mailbox/lib/expenseActivity';
import { NO_CATEGORY_ICON } from '@/MiniApps/Mailbox/lib/expenseCategories';
import type { ExpenseCategory } from '@/MiniApps/Mailbox/lib/expenseCategories';
import { formatMoney } from '@/MiniApps/Mailbox/lib/money';
import { show as showGroup } from '@/routes/apps/our-exchange/expenses/groups';
import Page from '@/Shell/Components/Page';
import PersonAvatar from '@/Shell/Components/PersonAvatar';
import LinkableIcon from '@/Shell/linkables/LinkableIcon';
import type { Person } from '@/types/person';

type Props = {
    expense: ExpensePayload;
    /* Still on the books, and restorable, but out of every balance. */
    deleted: boolean;
    group: { id: number; name: string };
    /* Who is in the group now: who an edit can name. */
    members: Person[];
    /* Everyone this expense names, a former member among them. */
    household: Person[];
    categories: ExpenseCategory[];
    /* This expense's own history, newest first. */
    activity: ExpenseActivity[];
    can: { edit: boolean; delete: boolean };
};

/* One expense or repayment as its receipt: what it was, who shares it, and what happened to it. */
export default function ExpensesShow({
    expense,
    deleted,
    group,
    members,
    household,
    categories,
    activity,
    can,
}: Props) {
    const viewerId = usePage().props.auth.user?.id ?? 0;
    const editing = useSheetSession<true>();
    const [deleting, setDeleting] = useState(false);

    /* Mid-sentence: "you" for the viewer. */
    const who = (id: number) =>
        id === viewerId
            ? 'you'
            : (household.find((person) => person.id === id)?.name ?? 'someone');
    const Who = (id: number) => (id === viewerId ? 'You' : who(id));
    const categoryLabel = (key: string | null) =>
        categories.find((item) => item.key === key)?.label ?? 'none';

    const category = categories.find((item) => item.key === expense.category);
    const noun = expense.is_settlement ? 'payment' : 'expense';
    const title = expense.is_settlement
        ? `${Who(expense.paid_by_id)} paid ${who(expense.shares[0]?.user_id ?? 0)}`
        : expense.title;
    const own = expense.shares.find(
        (share) => share.user_id === viewerId,
    )?.amount;

    return (
        <MailboxLayout>
            <Page
                title={expense.is_settlement ? 'Repayment' : expense.title}
                room={MAILBOX_ROOM}
                back={{ href: showGroup.url(group.id), label: group.name }}
            >
                <div className="mailbox-expense-layout">
                    <section
                        className="mailbox-expense-aside mailbox-slip"
                        aria-labelledby="expense-receipt"
                    >
                        <div className="mailbox-slip-paper">
                            <div className="mailbox-slip-head">
                                <span className="mailbox-expense-faces">
                                    <span className="mailbox-expense-icon">
                                        {expense.is_settlement ? (
                                            <HandCoins
                                                aria-hidden="true"
                                                strokeWidth={1.5}
                                            />
                                        ) : (
                                            <LinkableIcon
                                                name={
                                                    category?.icon ??
                                                    NO_CATEGORY_ICON
                                                }
                                                size={22}
                                                aria-hidden="true"
                                                strokeWidth={1.5}
                                            />
                                        )}
                                    </span>
                                    {expense.is_settlement
                                        ? 'Repayment'
                                        : (category?.label ??
                                          'No category')}{' '}
                                    · {formatPlainDate(expense.spent_on)}
                                </span>
                                {(can.edit || can.delete) && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger
                                            aria-label={`Options for this ${noun}`}
                                            render={
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="mailbox-card-menu shell-hit-44"
                                                />
                                            }
                                        >
                                            <MoreHorizontal
                                                size={18}
                                                strokeWidth={1.5}
                                                aria-hidden="true"
                                            />
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            {can.edit && (
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        editing.show(true)
                                                    }
                                                >
                                                    Edit
                                                </DropdownMenuItem>
                                            )}
                                            {can.delete && (
                                                <DropdownMenuItem
                                                    variant="destructive"
                                                    onClick={() =>
                                                        setDeleting(true)
                                                    }
                                                >
                                                    Delete
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>

                            {/* The page is titled with what it was; the receipt leads with how much. */}
                            <div>
                                <h2
                                    id="expense-receipt"
                                    className="mailbox-expense-summary"
                                >
                                    <span className="sr-only">{title}: </span>
                                    <span className="mailbox-expense-amount">
                                        {formatMoney(expense.amount)}
                                    </span>
                                </h2>
                                <p className="mailbox-expense-quiet">
                                    {expense.is_settlement
                                        ? title
                                        : `${Who(expense.paid_by_id)} paid`}
                                </p>
                            </div>

                            {deleted && (
                                <p className="mailbox-expense-quiet">
                                    This {noun} was deleted, so it counts
                                    towards nothing. Whoever is in the group can
                                    restore it from the activity.
                                </p>
                            )}

                            {!expense.is_settlement && (
                                <ul
                                    className="mailbox-slip-lines"
                                    aria-label="Who shares it"
                                >
                                    {expense.shares.map((share) => {
                                        const person = household.find(
                                            (one) => one.id === share.user_id,
                                        );

                                        return (
                                            <li key={share.user_id}>
                                                {person && (
                                                    <PersonAvatar
                                                        person={person}
                                                        size={24}
                                                    />
                                                )}
                                                <span className="mailbox-expense-row-main">
                                                    {Who(share.user_id)}
                                                </span>
                                                <span className="mailbox-expense-amount">
                                                    {formatMoney(share.amount)}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}

                            {!expense.is_settlement && (
                                <dl className="mailbox-slip-totals">
                                    <div>
                                        <dt>Your share</dt>
                                        <dd>
                                            {own
                                                ? formatMoney(own)
                                                : 'not involved'}
                                        </dd>
                                    </div>
                                </dl>
                            )}
                        </div>
                    </section>

                    <section
                        className="mailbox-expense-main"
                        aria-labelledby="expense-activity"
                    >
                        <h2
                            id="expense-activity"
                            className="mailbox-expense-heading"
                        >
                            Activity
                        </h2>
                        <ExpenseActivityList
                            entries={activity}
                            who={who}
                            categoryLabel={categoryLabel}
                        />
                    </section>
                </div>
            </Page>

            {editing.value && (
                <ExpenseSheet
                    key={editing.key}
                    open={editing.open}
                    onOpenChange={editing.onOpenChange}
                    groupId={group.id}
                    members={members}
                    viewerId={viewerId}
                    categories={categories}
                    expense={expense}
                />
            )}

            <ExpenseDeleteDialog
                expense={expense}
                open={deleting}
                onOpenChange={setDeleting}
            />
        </MailboxLayout>
    );
}
