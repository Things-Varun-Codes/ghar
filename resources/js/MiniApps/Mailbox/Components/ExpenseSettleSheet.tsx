import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useId } from 'react';

import { formSubmitOptions } from '@/lib/mutation';
import MoneyField from '@/MiniApps/Mailbox/Components/MoneyField';
import PersonChoice from '@/MiniApps/Mailbox/Components/PersonChoice';
import { moneyInput, parseMoney } from '@/MiniApps/Mailbox/lib/money';
import { store } from '@/routes/apps/our-exchange/expenses/settlements';
import FormSheet from '@/Shell/Components/FormSheet';
import SubmitButton from '@/Shell/Components/SubmitButton';
import type { Person } from '@/types/person';

export type ExpensePayment = { from_id: number; to_id: number; amount: number };

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    groupId: number;
    members: Person[];
    viewerId: number;
    /* The suggested payment it opens with. */
    payment: ExpensePayment;
};

const SHOWN_FIELDS = ['from_id', 'to_id', 'amount'];

/* Records that one person in the group paid another back. */
export default function ExpenseSettleSheet({
    open,
    onOpenChange,
    groupId,
    members,
    viewerId,
    payment,
}: Props) {
    const hintId = useId();
    const form = useForm({
        from_id: payment.from_id,
        to_id: payment.to_id,
        amount: moneyInput(payment.amount),
    });
    const { data, setData, processing, errors } = form;
    const amount = parseMoney(data.amount);

    const hint =
        data.from_id === data.to_id
            ? 'Choose two different people.'
            : !amount
              ? 'Enter the amount paid.'
              : null;
    const disabled = processing || hint !== null;

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (disabled) {
            return;
        }

        form.transform((values) => ({ ...values, amount }));
        form.post(store.url(groupId), {
            preserveScroll: true,
            ...formSubmitOptions({
                component: 'Mailbox/ExpenseSettleSheet',
                action: 'expense.settle',
                isShownField: (key) => SHOWN_FIELDS.includes(key),
                onSuccess: () => onOpenChange(false),
            }),
        });
    };

    return (
        <FormSheet
            open={open}
            onOpenChange={onOpenChange}
            title="Record a payment"
            description="Say who paid whom back, and how much."
            isDirty={form.isDirty}
            onSubmit={handleSubmit}
            hint={processing ? null : hint}
            hintId={hintId}
            footer={
                <SubmitButton
                    processing={processing}
                    disabled={disabled}
                    busyText="Recording…"
                    aria-describedby={hint ? hintId : undefined}
                >
                    Record payment
                </SubmitButton>
            }
        >
            <PersonChoice
                legend="Who paid"
                name="expense-settle-from"
                people={members}
                viewerId={viewerId}
                value={data.from_id}
                onChange={(id) => setData('from_id', id)}
                error={errors.from_id}
            />
            <PersonChoice
                legend="Paid to"
                name="expense-settle-to"
                people={members}
                viewerId={viewerId}
                value={data.to_id}
                onChange={(id) => setData('to_id', id)}
                error={errors.to_id}
            />
            <MoneyField
                id="expense-settle-amount"
                label="How much"
                value={data.amount}
                onChange={(value) => setData('amount', value)}
                amount={amount}
                error={errors.amount}
            />
        </FormSheet>
    );
}
