import type { FormEvent } from 'react';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import CharCount from '@/MiniApps/Mailbox/Components/CharCount';
import type { HouseholdMember } from '@/MiniApps/Mailbox/Components/RecipientPicker';
import RecipientPicker from '@/MiniApps/Mailbox/Components/RecipientPicker';
import { useComposeForm } from '@/MiniApps/Mailbox/Hooks/useComposeForm';
import { store } from '@/routes/apps/our-mailbox/messages';
import FormField from '@/Shell/Components/FormField';
import FormSheet from '@/Shell/Components/FormSheet';
import SubmitButton from '@/Shell/Components/SubmitButton';

const BODY_MAX = 600;

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    members: HouseholdMember[];
};

type FormShape = { recipient_ids: number[]; body: string };

export default function ComposerSheet({ open, onOpenChange, members }: Props) {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    const compose = useComposeForm<FormShape>({
        component: 'Mailbox/ComposerSheet',
        action: 'message.create',
        members,
        fields: { body: '' },
        dirtyFields: ['body'],
        shownFields: ['body'],
        missing: (data) =>
            data.body.trim() === '' ? 'Write something first.' : null,
    });
    const { data, setData, processing, errors, reset } = compose.form;

    useEffect(() => {
        if (open) {
            const id = window.setTimeout(() => {
                textareaRef.current?.focus();
            }, 100);

            return () => window.clearTimeout(id);
        }

        return undefined;
    }, [open]);

    const disabled = processing || compose.hint !== null;

    const submit = (event?: FormEvent<HTMLFormElement>) => {
        event?.preventDefault();

        if (disabled) {
            return;
        }

        compose.send(store.url(), {
            onSuccess: () => {
                compose.reset();
                onOpenChange(false);
            },
        });
    };

    const sendAnother = () => {
        if (disabled) {
            return;
        }

        compose.send(store.url(), {
            action: 'message.create-another',
            // Kept mounted so the sheet stays open; the list behind it re-seeds from the response.
            preserveState: true,
            onSuccess: () => {
                reset('body');
                // form.data still holds the sent body until the reset renders.
                compose.gateReset({ body: '' });
                textareaRef.current?.focus();
            },
        });
    };

    return (
        <FormSheet
            open={open}
            onOpenChange={onOpenChange}
            title="Write a note"
            description="Write a note and choose who it goes to."
            isDirty={compose.isDirty}
            discardTitle="Discard this note?"
            discardDescription="Your draft will be lost."
            onDiscard={compose.reset}
            onSubmit={submit}
            hint={compose.sheetHint}
            hintId={compose.hintId}
            width={640}
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={sendAnother}
                        disabled={disabled}
                        aria-describedby={compose.describedBy}
                        className="mailbox-btn-send-another"
                    >
                        Send &amp; write another
                    </Button>
                    <SubmitButton
                        processing={processing}
                        disabled={disabled}
                        busyText="Sending…"
                        aria-describedby={compose.describedBy}
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
        </FormSheet>
    );
}
