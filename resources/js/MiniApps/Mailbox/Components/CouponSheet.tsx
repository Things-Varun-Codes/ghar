import { useForm } from '@inertiajs/react';
import { Minus, Plus } from 'lucide-react';
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
import { store } from '@/routes/apps/our-mailbox/coupons';
import FormField from '@/Shell/Components/FormField';
import SubmitButton from '@/Shell/Components/SubmitButton';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    members: HouseholdMember[];
};

type CouponFormShape = {
    recipient_ids: number[];
    title: string;
    description: string;
    quantity: number;
    expires_at: string;
};

const TITLE_MAX = 80;
const DESCRIPTION_MAX = 500;
const QTY_MIN = 1;
const QTY_MAX = 20;

const SHOWN_FIELDS = ['title', 'description', 'quantity', 'expires_at'];
const isShownField = (key: string) =>
    SHOWN_FIELDS.includes(key) || key.startsWith('recipient_ids');

export default function CouponSheet({ open, onOpenChange, members }: Props) {
    const hintId = useId();
    const quantityLabelId = useId();

    const form = useForm<CouponFormShape>({
        recipient_ids: defaultRecipientIds(members),
        title: '',
        description: '',
        quantity: 1,
        expires_at: '',
    });
    const { data, setData, post, processing, errors, reset } = form;

    const { isDirty, reset: gateReset } = useDirtyFormGate(form, {
        fields: ['title', 'description', 'quantity', 'expires_at'],
    });

    const handleReset = () => {
        reset();
        gateReset();
    };

    const setQuantity = (n: number) => {
        setData('quantity', Math.max(QTY_MIN, Math.min(QTY_MAX, n)));
    };

    const hint =
        data.recipient_ids.length === 0
            ? 'Choose who it’s for.'
            : data.title.trim() === ''
              ? 'Say what it’s good for.'
              : null;
    const disabled = processing || hint !== null || data.quantity < QTY_MIN;

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
                reportRejected('Mailbox/CouponSheet', 'coupon.create', errs);
            },
            ...transportFailure({
                component: 'Mailbox/CouponSheet',
                action: 'coupon.create',
                message: SEND_FAILED_MESSAGE,
            }),
        });
    };

    return (
        <ComposeSheet
            open={open}
            onOpenChange={onOpenChange}
            title="Write a coupon"
            description="Write what the coupon is good for and choose who it is for."
            isDirty={isDirty}
            discardTitle="Discard this coupon?"
            discardBody="The details you entered will be lost."
            onDiscard={handleReset}
            onSubmit={handleSubmit}
            hint={processing ? null : hint}
            hintId={hintId}
            actions={
                <SubmitButton
                    processing={processing}
                    disabled={disabled}
                    busyText="Sending…"
                    aria-describedby={hint ? hintId : undefined}
                >
                    Send coupon
                </SubmitButton>
            }
        >
            <RecipientPicker
                legend="For"
                members={members}
                value={data.recipient_ids}
                onChange={(ids) => setData('recipient_ids', ids)}
                errors={errors}
            />

            <div>
                <FormField
                    label="Good for…"
                    name="coupon-title"
                    error={errors.title}
                    required
                    className="mailbox-form-field"
                >
                    <input
                        id="coupon-title"
                        type="text"
                        maxLength={TITLE_MAX}
                        value={data.title}
                        onChange={(e) => setData('title', e.target.value)}
                        aria-required="true"
                        placeholder="e.g. One free car wash"
                        className="mailbox-field"
                    />
                </FormField>
                <CharCount length={data.title.length} max={TITLE_MAX} />
            </div>

            <div role="group" aria-labelledby={quantityLabelId}>
                <p id={quantityLabelId} className="mailbox-field-label">
                    How many?
                </p>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        aria-label="Fewer"
                        onClick={() => setQuantity(data.quantity - 1)}
                        disabled={data.quantity <= QTY_MIN}
                        className="mailbox-coupon-step"
                    >
                        <Minus size={20} strokeWidth={1.5} aria-hidden="true" />
                    </button>
                    <span
                        aria-live="polite"
                        className="mailbox-coupon-quantity"
                    >
                        {data.quantity}
                    </span>
                    <button
                        type="button"
                        aria-label="More"
                        onClick={() => setQuantity(data.quantity + 1)}
                        disabled={data.quantity >= QTY_MAX}
                        className="mailbox-coupon-step"
                    >
                        <Plus size={20} strokeWidth={1.5} aria-hidden="true" />
                    </button>
                    <span className="text-(length:--mailbox-type-scale-eyebrow) text-(--mailbox-ink-soft)">
                        redemption
                        {data.quantity === 1 ? '' : 's'}
                    </span>
                </div>
                {errors.quantity && (
                    <p role="alert" className="mailbox-field-error">
                        {errors.quantity}
                    </p>
                )}
            </div>

            <FormField
                label="Valid until (optional)"
                name="coupon-expiry"
                error={errors.expires_at}
                className="mailbox-form-field"
            >
                <input
                    id="coupon-expiry"
                    type="date"
                    value={data.expires_at}
                    onChange={(e) => setData('expires_at', e.target.value)}
                    className="mailbox-field"
                />
            </FormField>

            <div>
                <FormField
                    label="Fine print (optional)"
                    name="coupon-description"
                    error={errors.description}
                    className="mailbox-form-field"
                >
                    <textarea
                        id="coupon-description"
                        className="mailbox-field"
                        value={data.description}
                        onChange={(e) => setData('description', e.target.value)}
                        rows={3}
                        maxLength={DESCRIPTION_MAX}
                        placeholder="e.g. Not valid during exams"
                    />
                </FormField>
                <CharCount
                    length={data.description.length}
                    max={DESCRIPTION_MAX}
                />
            </div>
        </ComposeSheet>
    );
}
