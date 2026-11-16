import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useId } from 'react';
import { useDirtyFormGate } from '@/hooks/use-dirty-form-gate';
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
    transportFailure,
} from '@/MiniApps/Mailbox/lib/visitFailure';
import { store } from '@/routes/apps/our-mailbox/challans';
import FormField from '@/Shell/Components/FormField';
import SubmitButton from '@/Shell/Components/SubmitButton';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    members: HouseholdMember[];
};

type ChallanFormShape = {
    recipient_ids: number[];
    offence: string;
    incident_date: string;
    incident_place: string;
    is_repeat: boolean;
    penalty: string;
    remarks: string;
};

const OFFENCE_MAX = 120;
const PLACE_MAX = 120;
const PENALTY_MAX = 80;
const REMARKS_MAX = 500;

const SHOWN_FIELDS = [
    'offence',
    'incident_date',
    'incident_place',
    'penalty',
    'remarks',
];
const isShownField = (key: string) =>
    SHOWN_FIELDS.includes(key) || key.startsWith('recipient_ids');

export default function ChallanSheet({ open, onOpenChange, members }: Props) {
    const hintId = useId();

    const form = useForm<ChallanFormShape>({
        recipient_ids: defaultRecipientIds(members),
        offence: '',
        incident_date: '',
        incident_place: '',
        is_repeat: false,
        penalty: '',
        remarks: '',
    });
    const { data, setData, post, processing, errors, reset } = form;

    const { isDirty, reset: gateReset } = useDirtyFormGate(form, {
        fields: ['offence', 'incident_place', 'penalty', 'remarks'],
    });

    const handleReset = () => {
        reset();
        gateReset();
    };

    const hint =
        data.recipient_ids.length === 0
            ? 'Choose who it’s for.'
            : data.offence.trim() === ''
              ? 'Name the offence.'
              : data.penalty.trim() === ''
                ? 'Set a penalty.'
                : null;
    const disabled = processing || hint !== null;

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (disabled) {
            return;
        }

        post(store.url(), {
            preserveScroll: true,
            preserveState: 'errors',
            onSuccess: () => {
                handleReset();
                onOpenChange(false);
            },
            onError: (errs) => {
                toastUnshownErrors(errs, isShownField, SEND_FAILED_MESSAGE);
                reportRejected('Mailbox/ChallanSheet', 'challan.create', errs);
            },
            ...transportFailure({
                component: 'Mailbox/ChallanSheet',
                action: 'challan.create',
                message: SEND_FAILED_MESSAGE,
            }),
        });
    };

    return (
        <ComposeSheet
            open={open}
            onOpenChange={onOpenChange}
            title="Issue a challan"
            description="Fill in the citation and choose who it is issued to."
            isDirty={isDirty}
            discardTitle="Discard this citation?"
            discardBody="The details you entered will be lost."
            onDiscard={handleReset}
            onSubmit={handleSubmit}
            hint={processing ? null : hint}
            hintId={hintId}
            actions={
                <SubmitButton
                    processing={processing}
                    disabled={disabled}
                    busyText="Filing…"
                    aria-describedby={hint ? hintId : undefined}
                >
                    Issue challan
                </SubmitButton>
            }
        >
            <RecipientPicker
                legend="Issue to"
                members={members}
                value={data.recipient_ids}
                onChange={(ids) => setData('recipient_ids', ids)}
                errors={errors}
            />

            <div>
                <FormField
                    label="Offence charged"
                    name="challan-offence"
                    error={errors.offence}
                    required
                    className="mailbox-form-field"
                >
                    <input
                        id="challan-offence"
                        type="text"
                        maxLength={OFFENCE_MAX}
                        value={data.offence}
                        onChange={(e) => setData('offence', e.target.value)}
                        aria-required="true"
                        placeholder="e.g. Replied with just 'k' to a whole paragraph"
                        className="mailbox-field"
                    />
                </FormField>
                <CharCount length={data.offence.length} max={OFFENCE_MAX} />
            </div>

            <div className="challan-incident-grid grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
                <FormField
                    label="Date of incident"
                    name="challan-date"
                    error={errors.incident_date}
                    className="mailbox-form-field"
                >
                    <input
                        id="challan-date"
                        type="date"
                        value={data.incident_date}
                        onChange={(e) =>
                            setData('incident_date', e.target.value)
                        }
                        className="mailbox-field"
                    />
                </FormField>
                <div>
                    <FormField
                        label="Place"
                        name="challan-place"
                        error={errors.incident_place}
                        className="mailbox-form-field"
                    >
                        <input
                            id="challan-place"
                            type="text"
                            maxLength={PLACE_MAX}
                            value={data.incident_place}
                            onChange={(e) =>
                                setData('incident_place', e.target.value)
                            }
                            placeholder="e.g. the group chat"
                            className="mailbox-field"
                        />
                    </FormField>
                    <CharCount
                        length={data.incident_place.length}
                        max={PLACE_MAX}
                    />
                </div>
            </div>

            <label className="mailbox-check-label">
                <input
                    type="checkbox"
                    checked={data.is_repeat}
                    onChange={(e) => setData('is_repeat', e.target.checked)}
                />
                Repeat offender
            </label>

            <div>
                <FormField
                    label="Penalty"
                    name="challan-penalty"
                    error={errors.penalty}
                    required
                    className="mailbox-form-field"
                >
                    <input
                        id="challan-penalty"
                        type="text"
                        maxLength={PENALTY_MAX}
                        value={data.penalty}
                        onChange={(e) => setData('penalty', e.target.value)}
                        aria-required="true"
                        placeholder="e.g. 3 hugs, payable on demand"
                        className="mailbox-field"
                    />
                </FormField>
                <CharCount length={data.penalty.length} max={PENALTY_MAX} />
            </div>

            <div>
                <FormField
                    label="Remarks (optional)"
                    name="challan-remarks"
                    error={errors.remarks}
                    className="mailbox-form-field"
                >
                    <textarea
                        id="challan-remarks"
                        className="mailbox-field"
                        value={data.remarks}
                        onChange={(e) => setData('remarks', e.target.value)}
                        rows={3}
                        maxLength={REMARKS_MAX}
                        placeholder="Any notes for the record…"
                    />
                </FormField>
                <CharCount length={data.remarks.length} max={REMARKS_MAX} />
            </div>
        </ComposeSheet>
    );
}
