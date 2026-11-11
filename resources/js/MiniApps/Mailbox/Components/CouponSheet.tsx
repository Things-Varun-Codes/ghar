import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';
import { useDirtyFormGate } from '@/hooks/use-dirty-form-gate';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useSwipeDismiss } from '@/hooks/use-swipe-dismiss';
import type { HouseholdMember } from '@/MiniApps/Mailbox/Components/RecipientPicker';
import RecipientPicker, {
    defaultRecipientIds,
} from '@/MiniApps/Mailbox/Components/RecipientPicker';
import { store } from '@/routes/apps/our-mailbox/coupons';

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

const DESCRIPTION_MAX = 500;
const QTY_MIN = 1;
const QTY_MAX = 20;

export default function CouponSheet({ open, onOpenChange, members }: Props) {
    const isWide = useMediaQuery('(min-width: 720px)');
    const side = isWide ? 'right' : 'bottom';
    useBodyScrollLock(open);

    const [discardOpen, setDiscardOpen] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

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

    const handleOpenChange = (next: boolean) => {
        if (next) {
            setSaveError(null);
        }

        if (!next && isDirty) {
            setDiscardOpen(true);

            return;
        }

        onOpenChange(next);
    };

    const swipeHandlers = useSwipeDismiss({
        enabled: side === 'bottom',
        onDismiss: () => handleOpenChange(false),
    });

    const handleReset = () => {
        reset();
        gateReset();
        setSaveError(null);
        setDiscardOpen(false);
    };

    const handleSubmit = () => {
        setSaveError(null);
        post(store.url(), {
            preserveScroll: true,
            preserveState: 'errors',
            onSuccess: () => {
                handleReset();
                onOpenChange(false);
            },
            onError: (errs) => {
                const first = Object.values(errs)[0] ?? null;
                setSaveError(first ?? 'Could not send the coupon. Try again.');
            },
        });
    };

    const setQuantity = (n: number) => {
        setData('quantity', Math.max(QTY_MIN, Math.min(QTY_MAX, n)));
    };

    const submitDisabled =
        processing ||
        data.title.trim() === '' ||
        data.quantity < QTY_MIN ||
        data.recipient_ids.length === 0;

    return (
        <>
            <Sheet open={open} onOpenChange={handleOpenChange}>
                <SheetContent
                    side={side}
                    data-app="our-mailbox"
                    className="mailbox-sheet-content [&_button.absolute]:!opacity-100"
                    style={{
                        maxWidth: side === 'right' ? '640px' : undefined,
                        width: side === 'right' ? '90vw' : '100%',
                        height: side === 'bottom' ? '90dvh' : '100dvh',
                    }}
                >
                    <SheetHeader>
                        <SheetTitle>Write a coupon</SheetTitle>
                    </SheetHeader>

                    <div {...swipeHandlers} className="mailbox-sheet-scroll">
                        <div className="flex flex-col gap-4.5 p-4">
                            <RecipientPicker
                                legend="For"
                                members={members}
                                value={data.recipient_ids}
                                onChange={(ids) =>
                                    setData('recipient_ids', ids)
                                }
                                errors={errors}
                            />

                            <div>
                                <label
                                    htmlFor="coupon-title"
                                    className="mailbox-field-label"
                                >
                                    Good for…
                                </label>
                                <input
                                    id="coupon-title"
                                    type="text"
                                    maxLength={80}
                                    value={data.title}
                                    onChange={(e) =>
                                        setData('title', e.target.value)
                                    }
                                    placeholder="e.g. One free car wash"
                                    className="mailbox-field"
                                />
                                {errors.title && (
                                    <p
                                        role="alert"
                                        className="mailbox-field-error"
                                    >
                                        {errors.title}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="mailbox-field-label">
                                    How many?
                                </label>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        aria-label="Fewer"
                                        onClick={() =>
                                            setQuantity(data.quantity - 1)
                                        }
                                        disabled={data.quantity <= QTY_MIN}
                                        className="mailbox-coupon-step"
                                        style={{
                                            opacity:
                                                data.quantity <= QTY_MIN
                                                    ? 0.5
                                                    : 1,
                                        }}
                                    >
                                        −
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
                                        onClick={() =>
                                            setQuantity(data.quantity + 1)
                                        }
                                        disabled={data.quantity >= QTY_MAX}
                                        className="mailbox-coupon-step"
                                        style={{
                                            opacity:
                                                data.quantity >= QTY_MAX
                                                    ? 0.5
                                                    : 1,
                                        }}
                                    >
                                        +
                                    </button>
                                    <span className="text-(length:--mailbox-type-scale-eyebrow) text-(--mailbox-ink-soft)">
                                        redemption
                                        {data.quantity === 1 ? '' : 's'}
                                    </span>
                                </div>
                                {errors.quantity && (
                                    <p
                                        role="alert"
                                        className="mailbox-field-error"
                                    >
                                        {errors.quantity}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="coupon-expiry"
                                    className="mailbox-field-label"
                                >
                                    Valid until (optional)
                                </label>
                                <input
                                    id="coupon-expiry"
                                    type="date"
                                    value={data.expires_at}
                                    onChange={(e) =>
                                        setData('expires_at', e.target.value)
                                    }
                                    className="mailbox-field"
                                />
                                {errors.expires_at && (
                                    <p
                                        role="alert"
                                        className="mailbox-field-error"
                                    >
                                        {errors.expires_at}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="coupon-description"
                                    className="mailbox-field-label"
                                >
                                    Fine print (optional)
                                </label>
                                <textarea
                                    id="coupon-description"
                                    className="mailbox-hand mailbox-hand-textarea mailbox-field"
                                    value={data.description}
                                    onChange={(e) =>
                                        setData('description', e.target.value)
                                    }
                                    rows={3}
                                    maxLength={DESCRIPTION_MAX}
                                    placeholder="e.g. Not valid during exams"
                                />
                            </div>

                            {saveError && (
                                <p role="alert" className="mailbox-field-error">
                                    {saveError}
                                </p>
                            )}

                            <div className="mt-2 flex justify-end">
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={submitDisabled}
                                    className="mailbox-btn-submit"
                                    style={{
                                        cursor: submitDisabled
                                            ? 'not-allowed'
                                            : 'pointer',
                                        opacity: submitDisabled ? 0.6 : 1,
                                    }}
                                >
                                    {processing ? 'Sending…' : 'Send coupon'}
                                </button>
                            </div>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
                <AlertDialogContent data-app="our-mailbox">
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Discard this coupon?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            The details you entered will be lost.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep editing</AlertDialogCancel>
                        <AlertDialogAction
                            className={buttonVariants({
                                variant: 'destructive',
                            })}
                            onClick={() => {
                                handleReset();
                                onOpenChange(false);
                            }}
                        >
                            Discard
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
