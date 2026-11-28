import { router } from '@inertiajs/react';
import { useState } from 'react';

import { mutationOptions } from '@/lib/mutation';
import { formatMoney } from '@/MiniApps/Mailbox/lib/money';
import { settle } from '@/routes/apps/our-exchange/expenses';
import ConfirmDialog from '@/Shell/Components/ConfirmDialog';
import PersonAvatar from '@/Shell/Components/PersonAvatar';
import SubmitButton from '@/Shell/Components/SubmitButton';
import type { Person } from '@/types/person';

export type ExpenseBalance = {
    person: Person;
    /* Minor units: positive when they owe the viewer, negative when the viewer owes them. */
    net: number;
};

/* What stands between the viewer and one person across every group, and settling all of it. */
export default function ExpenseBalanceRow({ person, net }: ExpenseBalance) {
    const [confirming, setConfirming] = useState(false);
    const [pending, setPending] = useState(false);
    const amount = formatMoney(Math.abs(net));
    const owed = net > 0;

    const settleUp = () => {
        router.post(
            settle.url(person.id),
            // What this row showed: the server refuses if the balance has moved since.
            { expected_net: net },
            {
                preserveScroll: true,
                ...mutationOptions({
                    component: 'Mailbox/ExpenseBalanceRow',
                    action: 'expense.settle-with',
                    onPendingChange: setPending,
                }),
            },
        );
    };

    return (
        <li>
            <PersonAvatar person={person} size={24} />
            <span className="mailbox-expense-row-main">
                {net === 0
                    ? `Even with ${person.name} overall`
                    : owed
                      ? `${person.name} owes you`
                      : `You owe ${person.name}`}
            </span>
            {net !== 0 && (
                <strong
                    className="mailbox-expense-amount"
                    data-direction={owed ? 'in' : 'out'}
                >
                    {amount}
                </strong>
            )}
            <SubmitButton
                type="button"
                variant="outline"
                size="sm"
                processing={pending}
                busyText="Settling…"
                onClick={() => setConfirming(true)}
                aria-label={`Settle up with ${person.name}`}
                className="mailbox-btn-neutral"
            >
                Settle up
            </SubmitButton>

            <ConfirmDialog
                open={confirming}
                onOpenChange={setConfirming}
                title={`Settle up with ${person.name}?`}
                description={
                    net === 0
                        ? `What you owe each other cancels out. This records the repayments in each group you share, and no money changes hands.`
                        : owed
                          ? `This records that ${person.name} paid you ${amount}, as a repayment in each group you share.`
                          : `This records that you paid ${person.name} ${amount}, as a repayment in each group you share.`
                }
                cancelLabel="Not yet"
                confirmLabel="Settle up"
                onConfirm={settleUp}
            />
        </li>
    );
}
