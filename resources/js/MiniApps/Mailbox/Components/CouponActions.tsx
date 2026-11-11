import { router } from '@inertiajs/react';
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
import type { CouponPayload } from '@/MiniApps/Mailbox/Components/CouponCard';
import {
    cancel,
    destroy,
    fulfill,
    request,
} from '@/routes/apps/our-mailbox/coupons';

export default function CouponActions({
    coupon,
    variant = 'detail',
}: {
    coupon: CouponPayload;
    variant?: 'row' | 'detail';
}) {
    const primary =
        variant === 'row' ? 'mailbox-btn-primary-row' : 'mailbox-btn-primary';
    const [busy, setBusy] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const actions = coupon.available_actions;
    const canRequest = actions.includes('request');
    const canCancel = actions.includes('cancel');
    const canFulfill = actions.includes('fulfill');
    const canDelete = actions.includes('delete');

    if (!canRequest && !canCancel && !canFulfill && !canDelete) {
        return null;
    }

    const patch = (url: string) => {
        setBusy(true);
        router.patch(
            url,
            {},
            {
                preserveScroll: true,
                preserveState: false,
                onFinish: () => setBusy(false),
            },
        );
    };

    const handleDelete = () => {
        setBusy(true);
        router.delete(destroy.url(coupon.id), {
            preserveScroll: true,
            preserveState: false,
            onFinish: () => {
                setBusy(false);
                setConfirmOpen(false);
            },
        });
    };

    return (
        <>
            <div className="flex flex-wrap gap-2">
                {canRequest && (
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => patch(request.url(coupon.id))}
                        className={primary}
                        style={{ opacity: busy ? 0.6 : 1 }}
                    >
                        Request this
                    </button>
                )}
                {canFulfill && (
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => patch(fulfill.url(coupon.id))}
                        className={primary}
                        style={{ opacity: busy ? 0.6 : 1 }}
                    >
                        Fulfil it
                    </button>
                )}
                {canCancel && (
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => patch(cancel.url(coupon.id))}
                        className="mailbox-btn-neutral"
                        style={{ opacity: busy ? 0.6 : 1 }}
                    >
                        Cancel request
                    </button>
                )}
                {canDelete && (
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirmOpen(true)}
                        className="mailbox-btn-neutral"
                        style={{ opacity: busy ? 0.6 : 1 }}
                    >
                        Withdraw
                    </button>
                )}
            </div>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent data-app="our-mailbox">
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Withdraw this coupon?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This removes it for them too. There's no undo.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep it</AlertDialogCancel>
                        <AlertDialogAction
                            className={buttonVariants({
                                variant: 'destructive',
                            })}
                            disabled={busy}
                            onClick={handleDelete}
                        >
                            Withdraw
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
