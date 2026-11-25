import { Link, usePage } from '@inertiajs/react';
import { ChevronDown, Plus } from 'lucide-react';

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useSheetSession } from '@/hooks/use-sheet-session';
import { count } from '@/lib/plural';
import ExpenseBalanceRow from '@/MiniApps/Mailbox/Components/ExpenseBalanceRow';
import type { ExpenseBalance } from '@/MiniApps/Mailbox/Components/ExpenseBalanceRow';
import ExpenseGroupSheet from '@/MiniApps/Mailbox/Components/ExpenseGroupSheet';
import type { ExpenseGroup } from '@/MiniApps/Mailbox/Components/ExpenseGroupSheet';
import MailboxLayout, {
    MAILBOX_ROOM,
} from '@/MiniApps/Mailbox/Layouts/MailboxLayout';
import { formatMoney } from '@/MiniApps/Mailbox/lib/money';
import { show } from '@/routes/apps/our-exchange/expenses/groups';
import EmptyState from '@/Shell/Components/EmptyState';
import Fab from '@/Shell/Components/Fab';
import Page from '@/Shell/Components/Page';
import type { Person } from '@/types/person';

/* `net` is the viewer's own balance in the group: positive when they are owed. */
type GroupRow = ExpenseGroup & { net: number };

type Props = {
    groups: GroupRow[];
    overview: ExpenseBalance[];
    members: Person[];
};

function GroupCard({ group }: { group: GroupRow }) {
    return (
        <li className="mailbox-card mailbox-expense-group shell-card-stretch shell-lift">
            <Link
                href={show.url(group.id)}
                prefetch="hover"
                className="shell-card-link mailbox-expense-group-name"
            >
                {group.name}
            </Link>
            <span className="mailbox-expense-meta">
                {count(group.member_ids.length, 'person', 'people')}
                {' · '}
                {group.net === 0
                    ? 'Settled'
                    : group.net > 0
                      ? `You are owed ${formatMoney(group.net)}`
                      : `You owe ${formatMoney(-group.net)}`}
            </span>
        </li>
    );
}

export default function ExpensesIndex({ groups, overview, members }: Props) {
    const viewerId = usePage().props.auth.user?.id ?? 0;
    const adding = useSheetSession<true>();
    const open = groups.filter((group) => !group.archived);
    const archived = groups.filter((group) => group.archived);

    return (
        <MailboxLayout>
            <Page
                title="Expenses"
                room={MAILBOX_ROOM}
                backChevron
                fab={
                    <Fab
                        onClick={() => adding.show(true)}
                        ariaLabel="New group"
                        icon={
                            <Plus
                                aria-hidden="true"
                                size={24}
                                strokeWidth={2.5}
                            />
                        }
                    />
                }
            >
                {groups.length === 0 ? (
                    <EmptyState
                        title="No shared expenses yet."
                        body="Tap the plus button to start a group and split the first one."
                    />
                ) : (
                    <div className="mailbox-expense-page">
                        <section aria-labelledby="expenses-balances">
                            <h2
                                id="expenses-balances"
                                className="mailbox-expense-heading"
                            >
                                Balances
                            </h2>
                            {overview.length === 0 ? (
                                <p className="mailbox-expense-quiet">
                                    All settled. Nobody owes you, and you owe
                                    nobody.
                                </p>
                            ) : (
                                <ul className="mailbox-card mailbox-expense-rows">
                                    {overview.map((balance) => (
                                        <ExpenseBalanceRow
                                            key={balance.person.id}
                                            {...balance}
                                        />
                                    ))}
                                </ul>
                            )}
                        </section>

                        <section aria-labelledby="expenses-groups">
                            <h2
                                id="expenses-groups"
                                className="mailbox-expense-heading"
                            >
                                Groups
                            </h2>
                            <ul className="mailbox-expense-groups">
                                {open.map((group) => (
                                    <GroupCard key={group.id} group={group} />
                                ))}
                            </ul>
                        </section>

                        {archived.length > 0 && (
                            <Collapsible>
                                <CollapsibleTrigger className="mailbox-expense-archived-toggle shell-focus">
                                    {count(
                                        archived.length,
                                        'archived group',
                                        'archived groups',
                                    )}
                                    <ChevronDown
                                        aria-hidden="true"
                                        size={16}
                                        strokeWidth={1.5}
                                    />
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <ul className="mailbox-expense-groups">
                                        {archived.map((group) => (
                                            <GroupCard
                                                key={group.id}
                                                group={group}
                                            />
                                        ))}
                                    </ul>
                                </CollapsibleContent>
                            </Collapsible>
                        )}
                    </div>
                )}
            </Page>

            {adding.value && (
                <ExpenseGroupSheet
                    key={adding.key}
                    open={adding.open}
                    onOpenChange={adding.onOpenChange}
                    household={members}
                    viewerId={viewerId}
                />
            )}
        </MailboxLayout>
    );
}
