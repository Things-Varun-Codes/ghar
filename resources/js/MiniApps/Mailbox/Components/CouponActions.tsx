import { router } from '@inertiajs/react';
import { useState } from 'react';

import { mutationOptions } from '@/lib/mutation';
import type { CouponPayload } from '@/MiniApps/Mailbox/Components/CouponCard';
import {
    cancel,
    destroy,
    fulfill,
    request,
} from '@/routes/apps/our-mailbox/coupons';
import ConfirmDialog from '@/Shell/Components/ConfirmDialog';
import SubmitButton from '@/Shell/Components/SubmitButton';

type Pending = 'request' | 'fulfill' | 'cancel' | 'delete' | null;

export default function CouponActions({
    coupon,
    variant = 'detail',
}: {
    coupon: CouponPayload;
    variant?: 'row' | 'detail';
}) {
    const [pending, setPending] = useState<Pending>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const actions = coupon.available_actions;
    const canRequest = actions.includes('request');
    const canCancel = actions.includes('cancel');
    const canFulfill = actions.includes('fulfill');
    const canDelete = actions.includes('delete');

    if (!canRequest && !canCancel && !canFulfill && !canDelete) {
        return null;
    }

    const isRow = variant === 'row';
    const primary = isRow ? 'mailbox-btn-primary-row' : 'mailbox-btn-primary';
    const size = isRow ? 'sm' : 'default';
    const busy = pending !== null;
    // Rows repeat down the list, so each button names its coupon.
    const named = (verb: string) =>
        isRow ? `${verb} “${coupon.title}”` : undefined;

    const patch = (url: string, kind: Exclude<Pending, 'delete' | null>) => {
        if (busy) {
            return;
        }

        router.patch(
            url,
            {},
            {
                preserveScroll: true,
                ...mutationOptions({
                    component: 'Mailbox/CouponActions',
                    action: `coupon.${kind}`,
                    onPendingChange: (p) => setPending(p ? kind : null),
                }),
            },
        );
    };

    const handleDelete = () => {
        if (busy) {
            return;
        }

        router.delete(destroy.url(coupon.id), {
            preserveScroll: true,
            ...mutationOptions({
                component: 'Mailbox/CouponActions',
                action: 'coupon.delete',
                onPendingChange: (p) => {
                    setPending(p ? 'delete' : null);

                    if (!p) {
                        setConfirmOpen(false);
                    }
                },
            }),
        });
    };

    return (
        <>
            <div className="flex flex-wrap gap-2">
                {canRequest && (
                    <SubmitButton
                        type="button"
                        size={size}
                        processing={pending === 'request'}
                        disabled={busy}
                        busyText="Requesting…"
                        onClick={() => patch(request.url(coupon.id), 'request')}
                        aria-label={named('Request')}
                        className={primary}
                    >
                        Request this
                    </SubmitButton>
                )}
                {canFulfill && (
                    <SubmitButton
                        type="button"
                        size={size}
                        processing={pending === 'fulfill'}
                        disabled={busy}
                        busyText="Fulfilling…"
                        onClick={() => patch(fulfill.url(coupon.id), 'fulfill')}
                        aria-label={named('Fulfil')}
                        className={primary}
                    >
                        Fulfil it
                    </SubmitButton>
                )}
                {canCancel && (
                    <SubmitButton
                        type="button"
                        variant="outline"
                        size={size}
                        processing={pending === 'cancel'}
                        disabled={busy}
                        busyText="Cancelling…"
                        onClick={() => patch(cancel.url(coupon.id), 'cancel')}
                        aria-label={named('Cancel request for')}
                        className="mailbox-btn-neutral"
                    >
                        Cancel request
                    </SubmitButton>
                )}
                {canDelete && (
                    <SubmitButton
                        type="button"
                        variant="outline"
                        size={size}
                        processing={pending === 'delete'}
                        disabled={busy}
                        busyText="Withdrawing…"
                        onClick={() => setConfirmOpen(true)}
                        aria-label={named('Withdraw')}
                        className="mailbox-btn-neutral mailbox-btn-danger"
                    >
                        Withdraw
                    </SubmitButton>
                )}
            </div>

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Withdraw this coupon?"
                description="This removes it for them too. There's no undo."
                cancelLabel="Keep it"
                confirmLabel="Withdraw"
                variant="destructive"
                onConfirm={handleDelete}
            />
        </>
    );
}
