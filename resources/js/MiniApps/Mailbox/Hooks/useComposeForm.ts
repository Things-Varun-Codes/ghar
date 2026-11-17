import type { FormDataType, VisitOptions } from '@inertiajs/core';
import { useForm } from '@inertiajs/react';
import { useId } from 'react';
import { useDirtyFormGate } from '@/hooks/use-dirty-form-gate';
import { formSubmitOptions } from '@/lib/mutation';
import type { HouseholdMember } from '@/MiniApps/Mailbox/Components/RecipientPicker';
import { defaultRecipientIds } from '@/MiniApps/Mailbox/Components/RecipientPicker';

export const SEND_FAILED_MESSAGE = "Couldn't send that. Try again.";

type Recipients = { recipient_ids: number[] };

type Options<T> = {
    /* For error reports: 'Mailbox/CitationSheet'. */
    component: string;
    action: string;
    members: HouseholdMember[];
    fields: Omit<T, 'recipient_ids'>;
    /* What makes it a draft worth asking about before closing; who it's for alone isn't. */
    dirtyFields: (keyof T)[];
    /* Fields that show their own errors; recipient_ids always does. */
    shownFields: (keyof T & string)[];
    /* Once someone is chosen, why it can't be sent yet, or null. */
    missing: (data: T) => string | null;
    noRecipientHint?: string;
};

type SendOptions = {
    onSuccess: () => void;
    action?: string;
    preserveState?: VisitOptions['preserveState'];
};

/*
 * What every Mailbox compose sheet shares: the form with who it's for chosen when there is only
 * one other person, the draft gate, the hint that says why it can't be sent yet, and a send
 * whose rejection reports only which fields were refused, never what was written.
 */
export function useComposeForm<T extends Recipients & FormDataType<T>>({
    component,
    action,
    members,
    fields,
    dirtyFields,
    shownFields,
    missing,
    noRecipientHint = 'Choose who it’s for.',
}: Options<T>) {
    const hintId = useId();
    const form = useForm<T>({
        recipient_ids: defaultRecipientIds(members),
        ...fields,
    } as T);
    const { isDirty, reset: gateReset } = useDirtyFormGate(form, {
        fields: dirtyFields,
    });

    const hint =
        (form.data.recipient_ids as number[]).length === 0
            ? noRecipientHint
            : missing(form.data);

    const reset = () => {
        form.reset();
        gateReset();
    };

    // A list's errors arrive per item: recipient_ids.0.
    const isShownField = (key: string) =>
        ['recipient_ids', ...shownFields].some(
            (field) => key === field || key.startsWith(`${field}.`),
        );

    const send = (url: string, options: SendOptions) =>
        form.post(url, {
            preserveScroll: true,
            preserveState: options.preserveState ?? 'errors',
            ...formSubmitOptions({
                component,
                action: options.action ?? action,
                isShownField,
                message: SEND_FAILED_MESSAGE,
                onSuccess: options.onSuccess,
            }),
        });

    return {
        form,
        isDirty,
        gateReset,
        reset,
        hint,
        hintId,
        /* For the submit's aria-describedby. */
        describedBy: hint ? hintId : undefined,
        /* What the sheet's footer shows: nothing while sending. */
        sheetHint: form.processing ? null : hint,
        send,
    };
}
