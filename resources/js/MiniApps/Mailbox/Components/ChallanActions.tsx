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
import type { ChallanPayload } from '@/MiniApps/Mailbox/Components/ChallanCard';
import { destroy, pay } from '@/routes/apps/our-mailbox/challans';

export default function ChallanActions({
    challan,
    variant = 'detail',
}: {
    challan: ChallanPayload;
    variant?: 'row' | 'detail';
}) {
    const [busy, setBusy] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const actions = challan.available_actions;
    const canPay = actions.includes('pay');
    const canDelete = actions.includes('delete');

    if (!canPay && !canDelete) {
        return null;
    }

    const handlePay = () => {
        setBusy(true);
        router.patch(
            pay.url(challan.id),
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
        router.delete(destroy.url(challan.id), {
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
                {canPay && (
                    <button
                        type="button"
                        disabled={busy}
                        onClick={handlePay}
                        className={
                            variant === 'row'
                                ? 'mailbox-btn-primary-row'
                                : 'mailbox-btn-primary'
                        }
                        style={{
                            opacity: busy ? 0.6 : 1,
                        }}
                    >
                        Pay penalty
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
                            Withdraw this citation?
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
