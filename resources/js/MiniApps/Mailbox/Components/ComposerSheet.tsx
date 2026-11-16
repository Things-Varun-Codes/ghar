import { router, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useEffect, useId, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useDirtyFormGate } from '@/hooks/use-dirty-form-gate';
import { transportFailureOptions } from '@/lib/mutation';
import CharCount from '@/MiniApps/Mailbox/Components/CharCount';
import ComposeSheet from '@/MiniApps/Mailbox/Components/ComposeSheet';
import type { HouseholdMember } from '@/MiniApps/Mailbox/Components/RecipientPicker';
import RecipientPicker, {
    defaultRecipientIds,
} from '@/MiniApps/Mailbox/Components/RecipientPicker';
import {
    reportRejected,
    SEND_FAILED_MESSAGE,
    toastUnshownErrors,
} from '@/MiniApps/Mailbox/lib/visitFailure';
import { store } from '@/routes/apps/our-mailbox/messages';
import FormField from '@/Shell/Components/FormField';
import SubmitButton from '@/Shell/Components/SubmitButton';

const BODY_MAX = 600;

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    members: HouseholdMember[];
};

type FormShape = { recipient_ids: number[]; body: string };

const isShownField = (key: string) =>
    key === 'body' || key.startsWith('recipient_ids');

export default function ComposerSheet({ open, onOpenChange, members }: Props) {
    const hintId = useId();
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    // "Send & write another" keeps the page mounted, so the list is refreshed on close.
    const sentWhileOpen = useRef(false);

    const form = useForm<FormShape>({
        recipient_ids: defaultRecipientIds(members),
        body: '',
    });
    const { data, setData, post, processing, errors, reset } = form;

    const { isDirty, reset: gateReset } = useDirtyFormGate(form, {
        fields: ['body'],
    });

    useEffect(() => {
        if (open) {
            const id = window.setTimeout(() => {
                textareaRef.current?.focus();
            }, 100);

            return () => window.clearTimeout(id);
        }

        return undefined;
    }, [open]);

    const close = () => {
        onOpenChange(false);

        if (sentWhileOpen.current) {
            sentWhileOpen.current = false;
            router.visit(window.location.href, {
                preserveScroll: true,
                preserveState: false,
                replace: true,
            });
        }
    };

    // The body is never sent to the error tracker: only which fields were rejected.
    const onRejected = (errs: Record<string, string>, action: string) => {
        toastUnshownErrors(errs, isShownField, SEND_FAILED_MESSAGE);
        reportRejected('Mailbox/ComposerSheet', action, errs);
    };

    const hint =
        data.recipient_ids.length === 0
            ? 'Choose who it’s for.'
            : data.body.trim() === ''
              ? 'Write something first.'
              : null;
    const disabled = processing || hint !== null;

    const submit = (event?: FormEvent<HTMLFormElement>) => {
        event?.preventDefault();

        if (disabled) {
            return;
        }

        post(store.url(), {
            preserveScroll: true,
            preserveState: 'errors',
            onSuccess: () => {
                sentWhileOpen.current = false;
                reset();
                gateReset();
                onOpenChange(false);
            },
            onError: (errs) => onRejected(errs, 'message.create'),
            ...transportFailureOptions({
                component: 'Mailbox/ComposerSheet',
                action: 'message.create',
                message: SEND_FAILED_MESSAGE,
            }),
        });
    };

    const sendAnother = () => {
        if (disabled) {
            return;
        }

        post(store.url(), {
            preserveScroll: true,
            onSuccess: () => {
                sentWhileOpen.current = true;
                reset('body');
                gateReset();
                textareaRef.current?.focus();
            },
            onError: (errs) => onRejected(errs, 'message.create-another'),
            ...transportFailureOptions({
                component: 'Mailbox/ComposerSheet',
                action: 'message.create',
                message: SEND_FAILED_MESSAGE,
            }),
        });
    };

    return (
        <ComposeSheet
            open={open}
            onOpenChange={(next) => (next ? onOpenChange(true) : close())}
            title="Write a note"
            description="Write a note and choose who it goes to."
            isDirty={isDirty}
            discardTitle="Discard this note?"
            discardBody="Your draft will be lost."
            onDiscard={() => {
                reset();
                gateReset();
            }}
            onSubmit={submit}
            hint={processing ? null : hint}
            hintId={hintId}
            actions={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={sendAnother}
                        disabled={disabled}
                        aria-describedby={hint ? hintId : undefined}
                        className="mailbox-btn-send-another"
                    >
                        Send &amp; write another
                    </Button>
                    <SubmitButton
                        processing={processing}
                        disabled={disabled}
                        busyText="Sending…"
                        aria-describedby={hint ? hintId : undefined}
                    >
                        Send note
                    </SubmitButton>
                </>
            }
        >
            <RecipientPicker
                members={members}
                value={data.recipient_ids}
                onChange={(ids) => setData('recipient_ids', ids)}
                errors={errors}
            />

            <div>
                <FormField
                    label="Your note"
                    name="mailbox-composer-body"
                    error={errors.body}
                    required
                    className="mailbox-form-field"
                >
                    <textarea
                        id="mailbox-composer-body"
                        ref={textareaRef}
                        className="mailbox-hand mailbox-composer-paper mailbox-note-input shell-field"
                        value={data.body}
                        onChange={(e) => setData('body', e.target.value)}
                        maxLength={BODY_MAX}
                        rows={5}
                        aria-required="true"
                        placeholder="Write a note…"
                    />
                </FormField>
                <CharCount length={data.body.length} max={BODY_MAX} />
            </div>
        </ComposeSheet>
    );
}
