import type { FormEvent } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import CharCount from '@/MiniApps/Mailbox/Components/CharCount';
import type { HouseholdMember } from '@/MiniApps/Mailbox/Components/RecipientPicker';
import RecipientPicker from '@/MiniApps/Mailbox/Components/RecipientPicker';
import { useComposeForm } from '@/MiniApps/Mailbox/Hooks/useComposeForm';
import { store } from '@/routes/apps/our-exchange/citations';
import FormField from '@/Shell/Components/FormField';
import FormSheet from '@/Shell/Components/FormSheet';
import SubmitButton from '@/Shell/Components/SubmitButton';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    members: HouseholdMember[];
};

type CitationFormShape = {
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

export default function CitationSheet({ open, onOpenChange, members }: Props) {
    const compose = useComposeForm<CitationFormShape>({
        component: 'Mailbox/CitationSheet',
        action: 'citation.create',
        members,
        fields: {
            offence: '',
            incident_date: '',
            incident_place: '',
            is_repeat: false,
            penalty: '',
            remarks: '',
        },
        dirtyFields: ['offence', 'incident_place', 'penalty', 'remarks'],
        shownFields: [
            'offence',
            'incident_date',
            'incident_place',
            'penalty',
            'remarks',
        ],
        missing: (data) =>
            data.offence.trim() === ''
                ? 'Name the offence.'
                : data.penalty.trim() === ''
                  ? 'Set a penalty.'
                  : null,
    });
    const { data, setData, processing, errors } = compose.form;
    const disabled = processing || compose.hint !== null;

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

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

    return (
        <FormSheet
            open={open}
            onOpenChange={onOpenChange}
            title="Issue a citation"
            description="Fill in the citation and choose who it is issued to."
            isDirty={compose.isDirty}
            discardTitle="Discard this citation?"
            discardDescription="The details you entered will be lost."
            onDiscard={compose.reset}
            onSubmit={handleSubmit}
            hint={compose.sheetHint}
            hintId={compose.hintId}
            width={640}
            footer={
                <SubmitButton
                    processing={processing}
                    disabled={disabled}
                    busyText="Filing…"
                    aria-describedby={compose.describedBy}
                >
                    Issue citation
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
                    name="citation-offence"
                    error={errors.offence}
                    required
                    className="mailbox-form-field"
                >
                    <Input
                        id="citation-offence"
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

            <div className="citation-incident-grid grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
                <FormField
                    label="Date of incident"
                    name="citation-date"
                    error={errors.incident_date}
                    className="mailbox-form-field"
                >
                    <Input
                        id="citation-date"
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
                        name="citation-place"
                        error={errors.incident_place}
                        className="mailbox-form-field"
                    >
                        <Input
                            id="citation-place"
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
                <Checkbox
                    checked={data.is_repeat}
                    onCheckedChange={(checked) => setData('is_repeat', checked)}
                />
                Repeat offender
            </label>

            <div>
                <FormField
                    label="Penalty"
                    name="citation-penalty"
                    error={errors.penalty}
                    required
                    className="mailbox-form-field"
                >
                    <Input
                        id="citation-penalty"
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
                    name="citation-remarks"
                    error={errors.remarks}
                    className="mailbox-form-field"
                >
                    <Textarea
                        id="citation-remarks"
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
        </FormSheet>
    );
}
