import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useId } from 'react';

import { Input } from '@/components/ui/input';
import {
    NativeSelect,
    NativeSelectOption,
} from '@/components/ui/native-select';
import { formSubmitOptions } from '@/lib/mutation';
import {
    formatMoney,
    moneyInput,
    parseMoney,
} from '@/MiniApps/Mailbox/lib/money';
import { store } from '@/routes/apps/our-exchange/expenses/settlements';
import FormField from '@/Shell/Components/FormField';
import FormSheet from '@/Shell/Components/FormSheet';
import SubmitButton from '@/Shell/Components/SubmitButton';
import type { Person } from '@/types/person';

export type ExpensePayment = { from_id: number; to_id: number; amount: number };

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    groupId: number;
    members: Person[];
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

    const person = (
        field: 'from_id' | 'to_id',
        label: string,
        name: string,
    ) => (
        <FormField
            label={label}
            name={name}
            error={errors[field]}
            className="mailbox-form-field"
        >
            <NativeSelect
                id={name}
                value={data[field]}
                onChange={(e) => setData(field, Number(e.target.value))}
                wrapperClassName="w-full"
                className="mailbox-field"
            >
                {members.map((member) => (
                    <NativeSelectOption key={member.id} value={member.id}>
                        {member.name}
                    </NativeSelectOption>
                ))}
            </NativeSelect>
        </FormField>
    );

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
            {person('from_id', 'Who paid', 'expense-settle-from')}
            {person('to_id', 'Paid to', 'expense-settle-to')}

            <FormField
                label="Amount"
                name="expense-settle-amount"
                error={errors.amount}
                helper={amount ? formatMoney(amount) : undefined}
                required
                className="mailbox-form-field"
            >
                <Input
                    id="expense-settle-amount"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={data.amount}
                    onChange={(e) => setData('amount', e.target.value)}
                    aria-required="true"
                    className="mailbox-field tabular-nums"
                />
            </FormField>
        </FormSheet>
    );
}
