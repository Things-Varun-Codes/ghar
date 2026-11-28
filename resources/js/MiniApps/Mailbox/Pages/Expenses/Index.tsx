import { Link, usePage } from '@inertiajs/react';
import { ChevronDown, ChevronRight, Plus, ReceiptText } from 'lucide-react';

import { Settle } from '@/components/motion';
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useSheetSession } from '@/hooks/use-sheet-session';
import { count } from '@/lib/plural';
import ExpenseFaces from '@/MiniApps/Mailbox/Components/ExpenseFaces';
import ExpenseGroupMenu from '@/MiniApps/Mailbox/Components/ExpenseGroupMenu';
import type { ExpenseGroupAbilities } from '@/MiniApps/Mailbox/Components/ExpenseGroupMenu';
import ExpenseGroupSheet from '@/MiniApps/Mailbox/Components/ExpenseGroupSheet';
import type { ExpenseGroup } from '@/MiniApps/Mailbox/Components/ExpenseGroupSheet';
import ExpenseStanding from '@/MiniApps/Mailbox/Components/ExpenseStanding';
import MailboxLayout, {
    MAILBOX_ROOM,
} from '@/MiniApps/Mailbox/Layouts/MailboxLayout';
import { formatMoney } from '@/MiniApps/Mailbox/lib/money';
import { balances } from '@/routes/apps/our-exchange/expenses';
import { order, show } from '@/routes/apps/our-exchange/expenses/groups';
import EmptyState from '@/Shell/Components/EmptyState';
import Fab from '@/Shell/Components/Fab';
import Page from '@/Shell/Components/Page';
import ReorderSheet from '@/Shell/Components/ReorderSheet';
import RoomDoor from '@/Shell/Components/RoomDoor';
import type { Person } from '@/types/person';

/* `net` is the viewer's own balance in the group: positive when they are owed. */
type GroupRow = ExpenseGroup & { net: number; can: ExpenseGroupAbilities };

type Props = {
    groups: GroupRow[];
    /* Minor units: positive when the viewer is owed overall. */
    overall: number;
    members: Person[];
};

/* A group as a door: a miniature of its slip, its name, and where the viewer stands in it. */
function GroupDoor({
    group,
    household,
    viewerId,
    index,
}: {
    group: GroupRow;
    household: Person[];
    viewerId: number;
    index: number;
}) {
    const { net } = group;
    const words =
        net === 0 ? 'Settled up' : net > 0 ? 'You are owed' : 'You owe';

    return (
        <RoomDoor
            href={show.url(group.id)}
            prefetch="hover"
            name={group.name}
            settleIndex={index}
            className="mailbox-card mailbox-door mailbox-door-group"
            nameClassName="mailbox-door-name"
            headClassName="mailbox-door-head"
            // The peek is hidden from a screen reader, so the line under the name says it too.
            live={
                <>
                    <span className="sr-only">
                        {net === 0
                            ? words
                            : `${words} ${formatMoney(Math.abs(net))}`}
                        .{' '}
                    </span>
                    <ExpenseFaces
                        people={household.filter((person) =>
                            group.member_ids.includes(person.id),
                        )}
                        total={group.member_ids.length}
                    />
                </>
            }
            aside={
                <ExpenseGroupMenu
                    group={group}
                    household={household}
                    viewerId={viewerId}
                />
            }
            peek={
                <div className="mailbox-door-expense">
                    <span className="mailbox-door-expense-line">
                        {net === 0 ? (
                            <span className="mailbox-coupon-stamp mailbox-expense-stamp">
                                Settled
                            </span>
                        ) : (
                            <>
                                <span>{words}</span>
                                <strong
                                    className="mailbox-expense-amount"
                                    data-direction={net > 0 ? 'in' : 'out'}
                                >
                                    {formatMoney(Math.abs(net))}
                                </strong>
                            </>
                        )}
                    </span>
                </div>
            }
        />
    );
}

export default function ExpensesIndex({ groups, overall, members }: Props) {
    const viewerId = usePage().props.auth.user?.id ?? 0;
    const adding = useSheetSession<true>();
    const reordering = useSheetSession<true>();
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
                        icon={ReceiptText}
                        title="No shared expenses yet."
                        body="Start a group for a trip, the house or a gift, and split the first bill."
                        action={
                            <Button
                                type="button"
                                onClick={() => adding.show(true)}
                            >
                                Start a group
                            </Button>
                        }
                    />
                ) : (
                    <div className="mailbox-expense-layout">
                        <section
                            className="mailbox-expense-aside mailbox-slip shell-card-stretch shell-lift"
                            aria-labelledby="expenses-standing"
                        >
                            <div className="mailbox-slip-paper">
                                <h2
                                    id="expenses-standing"
                                    className="mailbox-expense-summary"
                                >
                                    <ExpenseStanding
                                        net={overall}
                                        even="You are all square."
                                    />
                                </h2>
                                <Link
                                    href={balances.url()}
                                    prefetch="hover"
                                    className="shell-card-link mailbox-slip-more"
                                >
                                    {overall === 0
                                        ? 'See your balances'
                                        : 'See who, and settle up'}
                                    <ChevronRight
                                        aria-hidden="true"
                                        size={16}
                                        strokeWidth={1.5}
                                    />
                                </Link>
                            </div>
                        </section>

                        <div className="mailbox-expense-main">
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
                                            onClick={() =>
                                                reordering.show(true)
                                            }
                                        >
                                            Change order
                                        </Button>
                                    )}
                                </div>
                                {open.length === 0 ? (
                                    <p className="mailbox-expense-quiet">
                                        Every group is archived. Tap the plus
                                        button to start a new one.
                                    </p>
                                ) : (
                                    <div className="shell-doors-wrap">
                                        <div className="shell-doors">
                                            <Settle>
                                                {open.map((group, at) => (
                                                    <GroupDoor
                                                        key={group.id}
                                                        group={group}
                                                        household={members}
                                                        viewerId={viewerId}
                                                        index={at}
                                                    />
                                                ))}
                                            </Settle>
                                        </div>
                                    </div>
                                )}
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
                                        <div className="shell-doors-wrap">
                                            <div className="shell-doors">
                                                <Settle>
                                                    {archived.map(
                                                        (group, at) => (
                                                            <GroupDoor
                                                                key={group.id}
                                                                group={group}
                                                                household={
                                                                    members
                                                                }
                                                                viewerId={
                                                                    viewerId
                                                                }
                                                                index={at}
                                                            />
                                                        ),
                                                    )}
                                                </Settle>
                                            </div>
                                        </div>
                                    </CollapsibleContent>
                                </Collapsible>
                            )}
                        </div>
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
