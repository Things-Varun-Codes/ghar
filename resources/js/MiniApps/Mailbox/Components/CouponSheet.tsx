import { usePage } from '@inertiajs/react';
import { Minus, Plus } from 'lucide-react';
import type { FormEvent } from 'react';
import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import CharCount from '@/MiniApps/Mailbox/Components/CharCount';
import type { HouseholdMember } from '@/MiniApps/Mailbox/Components/RecipientPicker';
import RecipientPicker from '@/MiniApps/Mailbox/Components/RecipientPicker';
import { useComposeForm } from '@/MiniApps/Mailbox/Hooks/useComposeForm';
import { store } from '@/routes/apps/our-exchange/coupons';
import FormField from '@/Shell/Components/FormField';
import FormSheet from '@/Shell/Components/FormSheet';
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

const FIELDS = ['title', 'description', 'quantity', 'expires_at'] as const;

export default function CouponSheet({ open, onOpenChange, members }: Props) {
    const quantityLabelId = useId();
    const { today } = usePage().props;

    const compose = useComposeForm<CouponFormShape>({
        component: 'Mailbox/CouponSheet',
        action: 'coupon.create',
        members,
        fields: {
            title: '',
            description: '',
            quantity: 1,
            expires_at: '',
        },
        dirtyFields: [...FIELDS],
        shownFields: [...FIELDS],
        missing: (data) =>
            data.title.trim() === '' ? 'Say what it’s good for.' : null,
    });
    const { data, setData, processing, errors } = compose.form;

    const setQuantity = (n: number) => {
        setData('quantity', Math.max(QTY_MIN, Math.min(QTY_MAX, n)));
    };

    const disabled =
        processing || compose.hint !== null || data.quantity < QTY_MIN;

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
            title="Write a coupon"
            description="Write what the coupon is good for and choose who it is for."
            isDirty={compose.isDirty}
            discardTitle="Discard this coupon?"
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
                    busyText="Sending…"
                    aria-describedby={compose.describedBy}
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
                    <Input
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
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="Fewer"
                        onClick={() => setQuantity(data.quantity - 1)}
                        disabled={data.quantity <= QTY_MIN}
                        className="mailbox-coupon-step"
                    >
                        <Minus size={20} strokeWidth={1.5} aria-hidden="true" />
                    </Button>
                    <span
                        aria-live="polite"
                        className="mailbox-coupon-quantity"
                    >
                        {data.quantity}
                    </span>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="More"
                        onClick={() => setQuantity(data.quantity + 1)}
                        disabled={data.quantity >= QTY_MAX}
                        className="mailbox-coupon-step"
                    >
                        <Plus size={20} strokeWidth={1.5} aria-hidden="true" />
                    </Button>
                    <span className="text-(length:--mailbox-type-scale-eyebrow) text-(--mailbox-ink-soft)">
                        redemption
                        {data.quantity === 1 ? '' : 's'}
                    </span>
                </div>
                <FieldError className="mailbox-field-error">
                    {errors.quantity}
                </FieldError>
            </div>

            <FormField
                label="Valid until (optional)"
                name="coupon-expiry"
                error={errors.expires_at}
                className="mailbox-form-field"
            >
                <Input
                    id="coupon-expiry"
                    type="date"
                    min={today}
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
                    <Textarea
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
        </FormSheet>
    );
}
