import { Link, usePage } from '@inertiajs/react';
import { ChevronDown, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useSheetSession } from '@/hooks/use-sheet-session';
import { count } from '@/lib/plural';
import ExpenseBalanceRow from '@/MiniApps/Mailbox/Components/ExpenseBalanceRow';
import type { ExpenseBalance } from '@/MiniApps/Mailbox/Components/ExpenseBalanceRow';
import ExpenseGroupMenu from '@/MiniApps/Mailbox/Components/ExpenseGroupMenu';
import type { ExpenseGroupAbilities } from '@/MiniApps/Mailbox/Components/ExpenseGroupMenu';
import ExpenseGroupSheet from '@/MiniApps/Mailbox/Components/ExpenseGroupSheet';
import type { ExpenseGroup } from '@/MiniApps/Mailbox/Components/ExpenseGroupSheet';
import MailboxLayout, {
    MAILBOX_ROOM,
} from '@/MiniApps/Mailbox/Layouts/MailboxLayout';
import { formatMoney } from '@/MiniApps/Mailbox/lib/money';
import { order, show } from '@/routes/apps/our-exchange/expenses/groups';
import EmptyState from '@/Shell/Components/EmptyState';
import Fab from '@/Shell/Components/Fab';
import Page from '@/Shell/Components/Page';
import ReorderSheet from '@/Shell/Components/ReorderSheet';
import type { Person } from '@/types/person';

/* `net` is the viewer's own balance in the group: positive when they are owed. */
type GroupRow = ExpenseGroup & { net: number; can: ExpenseGroupAbilities };

type Props = {
    groups: GroupRow[];
    overview: ExpenseBalance[];
    members: Person[];
};

/* The viewer's net as a short label over the figure, the way a ledger column reads. */
function NetFigure({ net }: { net: number }) {
    if (net === 0) {
        return <span className="mailbox-expense-figure">settled up</span>;
    }

    return (
        <span className="mailbox-expense-figure">
            {net > 0 ? 'you are owed' : 'you owe'}{' '}
            <strong
                className="mailbox-expense-amount"
                data-direction={net > 0 ? 'in' : 'out'}
            >
                {formatMoney(Math.abs(net))}
            </strong>
        </span>
    );
}

function GroupRow({
    group,
    household,
    viewerId,
}: {
    group: GroupRow;
    household: Person[];
    viewerId: number;
}) {
    return (
        <li className="mailbox-expense-row mailbox-expense-group shell-card-stretch">
            <span className="mailbox-expense-row-main">
                <Link
                    href={show.url(group.id)}
                    prefetch="hover"
                    className="shell-card-link mailbox-expense-group-name"
                >
                    {group.name}
                </Link>
                <span className="mailbox-expense-meta">
                    {count(group.member_ids.length, 'person', 'people')}
                </span>
            </span>
            <NetFigure net={group.net} />
            <ExpenseGroupMenu
                group={group}
                household={household}
                viewerId={viewerId}
            />
        </li>
    );
}

export default function ExpensesIndex({ groups, overview, members }: Props) {
    const viewerId = usePage().props.auth.user?.id ?? 0;
    const adding = useSheetSession<true>();
    const reordering = useSheetSession<true>();
    const open = groups.filter((group) => !group.archived);
    const archived = groups.filter((group) => group.archived);
    const overall = overview.reduce((sum, balance) => sum + balance.net, 0);

    return (
        <MailboxLayout>
            <Page
                tier="prose"
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
                        <p className="mailbox-expense-summary">
                            {overall === 0 ? (
                                'Overall, you are settled up.'
                            ) : (
                                <>
                                    Overall,{' '}
                                    {overall > 0 ? 'you are owed' : 'you owe'}{' '}
                                    <strong
                                        className="mailbox-expense-amount"
                                        data-direction={
                                            overall > 0 ? 'in' : 'out'
                                        }
                                    >
                                        {formatMoney(Math.abs(overall))}
                                    </strong>
                                </>
                            )}
                        </p>

                        <section aria-labelledby="expenses-balances">
                            {/* The summary above already heads it. */}
                            <h2 id="expenses-balances" className="sr-only">
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
                            <div className="mailbox-expense-heading-row">
                                <h2
                                    id="expenses-groups"
                                    className="mailbox-expense-heading"
                                >
                                    Groups
                                </h2>
                                {open.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="mailbox-btn-quiet"
                                        onClick={() => reordering.show(true)}
                                    >
                                        Change order
                                    </Button>
                                )}
                            </div>
                            <ul className="mailbox-card mailbox-expense-rows">
                                {open.map((group) => (
                                    <GroupRow
                                        key={group.id}
                                        group={group}
                                        household={members}
                                        viewerId={viewerId}
                                    />
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
                                    <ul className="mailbox-card mailbox-expense-rows">
                                        {archived.map((group) => (
                                            <GroupRow
                                                key={group.id}
                                                group={group}
                                                household={members}
                                                viewerId={viewerId}
                                            />
                                        ))}
                                    </ul>
                                </CollapsibleContent>
                            </Collapsible>
                        )}
                    </div>
                )}
            </Page>

            {reordering.value && (
                <ReorderSheet
                    key={reordering.key}
                    open={reordering.open}
                    onOpenChange={reordering.onOpenChange}
                    title="Order of your groups"
                    description="Drag your groups, or use the arrows, into the order you want them listed."
                    items={open.map((group) => ({
                        id: group.id,
                        label: group.name,
                    }))}
                    url={order.url()}
                    component="Mailbox/ExpensesIndex"
                />
            )}

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
