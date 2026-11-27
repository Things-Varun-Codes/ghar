import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useId } from 'react';

import { Input } from '@/components/ui/input';
import { formSubmitOptions } from '@/lib/mutation';
import CharCount from '@/MiniApps/Mailbox/Components/CharCount';
import RecipientPicker, {
    defaultRecipientIds,
} from '@/MiniApps/Mailbox/Components/RecipientPicker';
import { store, update } from '@/routes/apps/our-exchange/expenses/groups';
import FormField from '@/Shell/Components/FormField';
import FormSheet from '@/Shell/Components/FormSheet';
import SubmitButton from '@/Shell/Components/SubmitButton';
import type { Person } from '@/types/person';

export type ExpenseGroup = {
    id: number;
    name: string;
    is_general: boolean;
    archived: boolean;
    member_ids: number[];
};

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /* Everyone in the household, the viewer among them. */
    household: Person[];
    viewerId: number;
    /* Set to rename it or change who is in it. */
    group?: ExpenseGroup;
};

const NAME_MAX = 60;

/* A new group, or an existing one's name and members. Whoever is filling it in stays in it. */
export default function ExpenseGroupSheet({
    open,
    onOpenChange,
    household,
    viewerId,
    group,
}: Props) {
    const hintId = useId();
    const others = household.filter(
        (person) => person.id !== viewerId && !person.former,
    );
    const form = useForm<{ name: string; member_ids: number[] }>({
        name: group?.name ?? '',
        member_ids: group
            ? others
                  .filter((person) => group.member_ids.includes(person.id))
                  .map((person) => person.id)
            : defaultRecipientIds(others),
    });
    const { data, setData, processing, errors } = form;

    const hint =
        data.name.trim() === ''
            ? 'Give the group a name.'
            : others.length > 0 && data.member_ids.length === 0
              ? 'Choose who is in it.'
              : null;
    const disabled = processing || hint !== null;

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (disabled) {
            return;
        }

        // Someone in the group who can't be picked any more (a former member) stays in it.
        const unlisted = (group?.member_ids ?? []).filter(
            (id) =>
                id !== viewerId && !others.some((person) => person.id === id),
        );

        form.transform((values) => ({
            name: values.name.trim(),
            member_ids: [...values.member_ids, viewerId, ...unlisted],
        }));

        const options = {
            preserveScroll: true,
            ...formSubmitOptions({
                component: 'Mailbox/ExpenseGroupSheet',
                action: group ? 'expense-group.update' : 'expense-group.create',
                isShownField: (key) =>
                    key === 'name' || key.startsWith('member_ids'),
                onSuccess: () => onOpenChange(false),
            }),
        };

        if (group) {
            form.patch(update.url(group.id), options);
        } else {
            form.post(store.url(), options);
        }
    };

    const membersError = Object.entries(errors).find(([key]) =>
        key.startsWith('member_ids'),
    )?.[1];

    return (
        <FormSheet
            open={open}
            onOpenChange={onOpenChange}
            title={group ? 'Group details' : 'New group'}
            description="Name the group and choose who shares its expenses."
            isDirty={form.isDirty}
            onSubmit={handleSubmit}
            hint={processing ? null : hint}
            hintId={hintId}
            footer={
                <SubmitButton
                    processing={processing}
                    disabled={disabled}
                    busyText="Saving…"
                    aria-describedby={hint ? hintId : undefined}
                >
                    {group ? 'Save' : 'Create group'}
                </SubmitButton>
            }
        >
            <div>
                <FormField
                    label="Name"
                    name="expense-group-name"
                    error={errors.name}
                    required
                    className="mailbox-form-field"
                >
                    <Input
                        id="expense-group-name"
                        type="text"
                        maxLength={NAME_MAX}
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        aria-required="true"
                        placeholder="e.g. Goa trip"
                        className="mailbox-field"
                    />
                </FormField>
                <CharCount length={data.name.length} max={NAME_MAX} />
            </div>

            {others.length > 0 && (
                <div>
                    <RecipientPicker
                        legend="Who is in it"
                        members={others}
                        value={data.member_ids}
                        onChange={(ids) => setData('member_ids', ids)}
                        errors={{ recipient_ids: membersError }}
                    />
                    <p className="mailbox-field-helper">
                        You are always in a group you make or change.
                    </p>
                </div>
            )}
        </FormSheet>
    );
}
