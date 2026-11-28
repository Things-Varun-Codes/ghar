import ExpenseBalanceRow from '@/MiniApps/Mailbox/Components/ExpenseBalanceRow';
import type { ExpenseBalance } from '@/MiniApps/Mailbox/Components/ExpenseBalanceRow';
import ExpenseStanding from '@/MiniApps/Mailbox/Components/ExpenseStanding';
import MailboxLayout, {
    MAILBOX_ROOM,
} from '@/MiniApps/Mailbox/Layouts/MailboxLayout';
import { index } from '@/routes/apps/our-exchange/expenses';
import EmptyState from '@/Shell/Components/EmptyState';
import Page from '@/Shell/Components/Page';

type Props = {
    /* Minor units: positive when the viewer is owed overall. */
    overall: number;
    overview: ExpenseBalance[];
};

/* Who the viewer owes and who owes them, across every group, and settling each of them up. */
export default function ExpensesBalances({ overall, overview }: Props) {
    return (
        <MailboxLayout>
            <Page
                tier="prose"
                title="Balances"
                room={MAILBOX_ROOM}
                back={{ href: index.url(), label: 'Expenses' }}
            >
                {overview.length === 0 ? (
                    <EmptyState
                        title="You are all square."
                        body="Nobody owes you, and you owe nobody."
                    />
                ) : (
                    <section
                        className="mailbox-slip mailbox-expense-solo"
                        aria-labelledby="expenses-standing"
                    >
                        <div className="mailbox-slip-paper">
                            <h2
                                id="expenses-standing"
                                className="mailbox-expense-summary"
                            >
                                <ExpenseStanding
                                    net={overall}
                                    even="Overall, you are even."
                                />
                            </h2>
                            <p className="mailbox-expense-quiet">
                                Across all your groups. Settling up records a
                                repayment in each group you share.
                            </p>
                            <ul className="mailbox-slip-lines">
                                {overview.map((balance) => (
                                    <ExpenseBalanceRow
                                        key={balance.person.id}
                                        {...balance}
                                    />
                                ))}
                            </ul>
                        </div>
                    </section>
                )}
            </Page>
        </MailboxLayout>
    );
}
