import { router } from '@inertiajs/react';
import { useState } from 'react';

import { formatInstant } from '@/lib/dates';
import { mutationOptions } from '@/lib/mutation';
import { describeActivity } from '@/MiniApps/Mailbox/lib/expenseActivity';
import type { ExpenseActivity } from '@/MiniApps/Mailbox/lib/expenseActivity';
import { restore } from '@/routes/apps/our-exchange/expenses';
import PersonAvatar from '@/Shell/Components/PersonAvatar';
import SubmitButton from '@/Shell/Components/SubmitButton';

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
                            component: 'Mailbox/ExpenseActivityList',
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

type Props = {
    entries: ExpenseActivity[];
    /* Names a person mid-sentence: "you" for the viewer. */
    who: (id: number) => string;
    categoryLabel: (key: string | null) => string;
};

/* What happened, newest first, on a sheet: a group's whole activity, or one expense's. */
export default function ExpenseActivityList({
    entries,
    who,
    categoryLabel,
}: Props) {
    return (
        <ul className="mailbox-card mailbox-expense-rows">
            {entries.map((entry) => (
                <li key={entry.id} className="mailbox-expense-row">
                    <PersonAvatar person={entry.actor} size={32} />
                    <div className="mailbox-expense-row-main">
                        <p className="m-0">
                            {describeActivity(entry, who, categoryLabel)}
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
                    {entry.can_restore && entry.expense_id !== null && (
                        <RestoreButton expenseId={entry.expense_id} />
                    )}
                </li>
            ))}
        </ul>
    );
}
