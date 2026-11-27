import { useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useId, useState } from 'react';
import type { HistoryEntry } from 'whatcategory';

import { FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    NativeSelect,
    NativeSelectOption,
} from '@/components/ui/native-select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from '@/components/ui/select';
import { formSubmitOptions } from '@/lib/mutation';
import CharCount from '@/MiniApps/Mailbox/Components/CharCount';
import ExpenseDeleteDialog from '@/MiniApps/Mailbox/Components/ExpenseDeleteDialog';
import RecipientPicker from '@/MiniApps/Mailbox/Components/RecipientPicker';
import {
    NO_CATEGORY_ICON,
    useSuggestedCategory,
} from '@/MiniApps/Mailbox/lib/expenseCategories';
import type { ExpenseCategory } from '@/MiniApps/Mailbox/lib/expenseCategories';
import {
    formatMoney,
    leftToAssign,
    moneyInput,
    parseMoney,
} from '@/MiniApps/Mailbox/lib/money';
import { store, update } from '@/routes/apps/our-exchange/expenses';
import FormField from '@/Shell/Components/FormField';
import FormSheet from '@/Shell/Components/FormSheet';
import SubmitButton from '@/Shell/Components/SubmitButton';
import LinkableIcon from '@/Shell/linkables/LinkableIcon';
import type { Person } from '@/types/person';

type SplitMode = 'equal' | 'exact';

export type ExpensePayload = {
    id: number;
    title: string;
    /* Minor units, like every amount here. */
    amount: number;
    spent_on: string;
    split_mode: SplitMode;
    /* An ExpenseCategory key; null has none and reads as the receipt. */
    category: string | null;
    is_settlement: boolean;
    paid_by_id: number;
    shares: { user_id: number; amount: number }[];
    created_by_id: number;
    updated_by_id: number | null;
    created_at: string;
};

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    groupId: number;
    members: Person[];
    viewerId: number;
    /* Set to change or delete one. */
    expense?: ExpensePayload;
    categories: ExpenseCategory[];
    /* The group's earlier titles and categories, so a new one can repeat them. */
    categoryHistory?: HistoryEntry[];
};

type FormShape = {
    title: string;
    amount: string;
    spent_on: string;
    paid_by_id: number;
    split_mode: SplitMode;
    category: string | null;
    participant_ids: number[];
    /* What each person owes in an exact split, as typed, by user id. */
    shares: Record<string, string>;
};

const TITLE_MAX = 120;
const NO_HISTORY: HistoryEntry[] = [];
/* The Select's value for no category, which it can't hold as null. */
const NONE = 'none';

function CategoryChoice({ category }: { category?: ExpenseCategory }) {
    return (
        <span className="flex min-w-0 items-center gap-2.5">
            <LinkableIcon
                name={category?.icon ?? NO_CATEGORY_ICON}
                size={18}
                aria-hidden="true"
                strokeWidth={1.5}
            />
            <span className="truncate">{category?.label ?? 'None'}</span>
        </span>
    );
}
const SHOWN_FIELDS = [
    'title',
    'category',
    'amount',
    'spent_on',
    'paid_by_id',
    'participant_ids',
    'shares',
];

function errorFor(
    errors: Partial<Record<string, string>>,
    field: string,
): string | undefined {
    // A list's errors arrive per item: shares.0.amount.
    return Object.entries(errors).find(
        ([key]) => key === field || key.startsWith(`${field}.`),
    )?.[1];
}

export default function ExpenseSheet({
    open,
    onOpenChange,
    groupId,
    members: onTheBooks,
    viewerId,
    expense,
    categories,
    categoryHistory = NO_HISTORY,
}: Props) {
    const { today } = usePage().props;
    // A former member can't go on anything new, but stays on an expense they were already on.
    const members = onTheBooks.filter(
        (member) =>
            !member.former ||
            member.id === expense?.paid_by_id ||
            expense?.shares.some((share) => share.user_id === member.id),
    );
    const hintId = useId();
    const splitLabelId = useId();
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const form = useForm<FormShape>({
        title: expense?.title ?? '',
        amount: expense ? moneyInput(expense.amount) : '',
        spent_on: expense?.spent_on ?? today,
        paid_by_id:
            expense?.paid_by_id ??
            (members.some((member) => member.id === viewerId)
                ? viewerId
                : members[0].id),
        split_mode: expense?.split_mode ?? 'equal',
        category: expense?.category ?? null,
        participant_ids:
            expense?.shares.map((share) => share.user_id) ??
            members.map((member) => member.id),
        shares: Object.fromEntries(
            (expense?.shares ?? []).map((share) => [
                String(share.user_id),
                moneyInput(share.amount),
            ]),
        ),
    });
    const { data, setData, processing, errors } = form;

    // Only a new expense follows its title, until someone picks a category, "None" included.
    const [picked, setPicked] = useState(Boolean(expense));
    const suggested = useSuggestedCategory(
        data.title,
        categories,
        categoryHistory,
        !picked,
    );
    const categoryKey = picked ? data.category : suggested;
    const category = categories.find((item) => item.key === categoryKey);
    const total = parseMoney(data.amount);
    const exact = data.split_mode === 'exact';
    const typed = members.map((member) => data.shares[member.id] ?? '');
    const shares = typed.map(parseMoney);
    const left = leftToAssign(total, shares);
    const unreadable = typed.some(
        (text, index) => text.trim() !== '' && shares[index] === null,
    );

    const leftText =
        left === null
            ? null
            : left === 0
              ? 'Adds up to the total.'
              : left > 0
                ? `${formatMoney(left)} left to assign.`
                : `${formatMoney(-left)} over the total.`;

    const hint =
        data.title.trim() === ''
            ? 'Say what it was for.'
            : !total
              ? 'Enter the amount.'
              : !exact
                ? data.participant_ids.length === 0
                    ? 'Choose who shares it.'
                    : null
                : unreadable
                  ? 'Check what each person owes.'
                  : left !== 0
                    ? 'Make the amounts add up to the total.'
                    : null;
    const busy = processing || deleting;
    const disabled = busy || hint !== null;

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (disabled) {
            return;
        }

        form.transform((values) => ({
            title: values.title.trim(),
            amount: total,
            spent_on: values.spent_on,
            paid_by_id: values.paid_by_id,
            split_mode: values.split_mode,
            category: categoryKey,
            ...(exact
                ? {
                      shares: members.flatMap((member, index) =>
                          shares[index]
                              ? [{ user_id: member.id, amount: shares[index] }]
                              : [],
                      ),
                  }
                : { participant_ids: values.participant_ids }),
        }));

        const options = {
            preserveScroll: true,
            ...formSubmitOptions({
                component: 'Mailbox/ExpenseSheet',
                action: expense ? 'expense.update' : 'expense.create',
                isShownField: (key) =>
                    SHOWN_FIELDS.some(
                        (field) => key === field || key.startsWith(`${field}.`),
                    ),
                onSuccess: () => onOpenChange(false),
            }),
        };

        if (expense) {
            form.patch(update.url(expense.id), options);
        } else {
            form.post(store.url(groupId), options);
        }
    };

    const sharesError = errorFor(errors, 'shares');

    return (
        <FormSheet
            open={open}
            onOpenChange={onOpenChange}
            title={expense ? 'Edit expense' : 'Add an expense'}
            description="Say what it was, who paid, and who shares it."
            isDirty={form.isDirty}
            discardTitle="Discard this expense?"
            discardDescription="The details you entered will be lost."
            onSubmit={handleSubmit}
            hint={busy ? null : hint}
            hintId={hintId}
            footer={
                <>
                    {expense && (
                        <SubmitButton
                            type="button"
                            variant="outline"
                            processing={deleting}
                            disabled={busy}
                            busyText="Deleting…"
                            onClick={() => setConfirmingDelete(true)}
                            className="mailbox-btn-neutral mailbox-btn-danger"
                        >
                            Delete
                        </SubmitButton>
                    )}
                    <SubmitButton
                        processing={processing}
                        disabled={disabled}
                        busyText="Saving…"
                        aria-describedby={hint ? hintId : undefined}
                    >
                        {expense ? 'Save' : 'Add expense'}
                    </SubmitButton>
                </>
            }
        >
            <div>
                <FormField
                    label="What was it for"
                    name="expense-title"
                    error={errors.title}
                    required
                    className="mailbox-form-field"
                >
                    <Input
                        id="expense-title"
                        type="text"
                        maxLength={TITLE_MAX}
                        value={data.title}
                        onChange={(e) => setData('title', e.target.value)}
                        aria-required="true"
                        placeholder="e.g. Groceries"
                        className="mailbox-field"
                    />
                </FormField>
                <CharCount length={data.title.length} max={TITLE_MAX} />
            </div>

            <FormField
                label="Category"
                name="expense-category"
                error={errors.category}
                className="mailbox-form-field"
            >
                <Select
                    value={category?.key ?? NONE}
                    onValueChange={(key) => {
                        setPicked(true);
                        setData(
                            'category',
                            key === NONE || key === null ? null : key,
                        );
                    }}
                >
                    <SelectTrigger
                        id="expense-category"
                        className="mailbox-field w-full"
                        aria-invalid={errors.category ? true : undefined}
                    >
                        <CategoryChoice category={category} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={NONE}>
                            <CategoryChoice />
                        </SelectItem>
                        {categories.map((item) => (
                            <SelectItem key={item.key} value={item.key}>
                                <CategoryChoice category={item} />
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </FormField>

            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
                <FormField
                    label="Amount"
                    name="expense-amount"
                    error={errors.amount}
                    helper={total ? formatMoney(total) : undefined}
                    required
                    className="mailbox-form-field"
                >
                    <Input
                        id="expense-amount"
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        value={data.amount}
                        onChange={(e) => setData('amount', e.target.value)}
                        aria-required="true"
                        placeholder="0"
                        className="mailbox-field tabular-nums"
                    />
                </FormField>
                <FormField
                    label="Date"
                    name="expense-date"
                    error={errors.spent_on}
                    className="mailbox-form-field"
                >
                    <Input
                        id="expense-date"
                        type="date"
                        max={today}
                        value={data.spent_on}
                        onChange={(e) => setData('spent_on', e.target.value)}
                        className="mailbox-field"
                    />
                </FormField>
            </div>

            <FormField
                label="Paid by"
                name="expense-paid-by"
                error={errors.paid_by_id}
                className="mailbox-form-field"
            >
                <NativeSelect
                    id="expense-paid-by"
                    value={data.paid_by_id}
                    onChange={(e) =>
                        setData('paid_by_id', Number(e.target.value))
                    }
                    wrapperClassName="w-full"
                    className="mailbox-field"
                >
                    {members.map((member) => (
                        <NativeSelectOption key={member.id} value={member.id}>
                            {member.id === viewerId ? 'You' : member.name}
                        </NativeSelectOption>
                    ))}
                </NativeSelect>
            </FormField>

            <div>
                <p id={splitLabelId} className="mailbox-field-label">
                    How to split it
                </p>
                <RadioGroup
                    aria-labelledby={splitLabelId}
                    value={data.split_mode}
                    onValueChange={(mode) =>
                        setData('split_mode', mode as SplitMode)
                    }
                    className="flex flex-wrap gap-x-6 gap-y-0"
                >
                    <label className="mailbox-check-label">
                        <RadioGroupItem value="equal" />
                        Equally
                    </label>
                    <label className="mailbox-check-label">
                        <RadioGroupItem value="exact" />
                        By exact amounts
                    </label>
                </RadioGroup>
            </div>

            {exact ? (
                <fieldset className="mailbox-recipients">
                    <legend className="mailbox-recipients-legend">
                        What each person owes
                    </legend>
                    <div className="mailbox-expense-shares">
                        {members.map((member) => (
                            <label
                                key={member.id}
                                className="mailbox-expense-share"
                            >
                                <span>{member.name}</span>
                                <Input
                                    type="text"
                                    inputMode="decimal"
                                    autoComplete="off"
                                    value={data.shares[member.id] ?? ''}
                                    onChange={(e) =>
                                        setData('shares', {
                                            ...data.shares,
                                            [member.id]: e.target.value,
                                        })
                                    }
                                    placeholder="0"
                                    className="mailbox-field tabular-nums"
                                />
                            </label>
                        ))}
                    </div>
                    {leftText && (
                        <p className="mailbox-field-helper" aria-live="polite">
                            {leftText}
                        </p>
                    )}
                    {sharesError && (
                        <FieldError className="mailbox-field-error">
                            {sharesError}
                        </FieldError>
                    )}
                </fieldset>
            ) : (
                <RecipientPicker
                    legend="Split between"
                    members={members}
                    value={data.participant_ids}
                    onChange={(ids) => setData('participant_ids', ids)}
                    errors={{
                        recipient_ids: errorFor(errors, 'participant_ids'),
                    }}
                />
            )}

            {expense && (
                <ExpenseDeleteDialog
                    expense={expense}
                    open={confirmingDelete}
                    onOpenChange={setConfirmingDelete}
                    onPendingChange={setDeleting}
                    onDeleted={() => onOpenChange(false)}
                />
            )}
        </FormSheet>
    );
}
