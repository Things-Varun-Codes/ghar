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
import { mutationOptions } from '@/lib/mutation';
import type { ChallanPayload } from '@/MiniApps/Mailbox/Components/ChallanCard';
import { destroy, pay } from '@/routes/apps/our-mailbox/challans';
import SubmitButton from '@/Shell/Components/SubmitButton';

type Pending = 'pay' | 'delete' | null;

export default function ChallanActions({
    challan,
    variant = 'detail',
}: {
    challan: ChallanPayload;
    variant?: 'row' | 'detail';
}) {
    const [pending, setPending] = useState<Pending>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [payOpen, setPayOpen] = useState(false);

    const actions = challan.available_actions;
    const canPay = actions.includes('pay');
    const canDelete = actions.includes('delete');

    if (!canPay && !canDelete) {
        return null;
    }

    const busy = pending !== null;
    const size = variant === 'row' ? 'sm' : 'default';

    const handlePay = () => {
        if (busy) {
            return;
        }

        router.patch(
            pay.url(challan.id),
            {},
            {
                preserveScroll: true,
                preserveState: false,
                ...mutationOptions({
                    component: 'Mailbox/ChallanActions',
                    action: 'challan.pay',
                    onPendingChange: (p) => setPending(p ? 'pay' : null),
                }),
            },
        );
    };

    const handleDelete = () => {
        if (busy) {
            return;
        }

        router.delete(destroy.url(challan.id), {
            preserveScroll: true,
            preserveState: false,
            ...mutationOptions({
                component: 'Mailbox/ChallanActions',
                action: 'challan.delete',
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
                {canPay && (
                    <SubmitButton
                        type="button"
                        size={size}
                        processing={pending === 'pay'}
                        disabled={busy}
                        busyText="Paying…"
                        onClick={() => setPayOpen(true)}
                        aria-label={
                            variant === 'row'
                                ? `Pay penalty for “${challan.offence}”`
                                : undefined
                        }
                        className={
                            variant === 'row'
                                ? 'mailbox-btn-primary-row'
                                : 'mailbox-btn-primary'
                        }
                    >
                        Pay penalty
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
                        aria-label={
                            variant === 'row'
                                ? `Withdraw “${challan.offence}”`
                                : undefined
                        }
                        className="mailbox-btn-neutral mailbox-btn-danger"
                    >
                        Withdraw
                    </SubmitButton>
                )}
            </div>

            <AlertDialog open={payOpen} onOpenChange={setPayOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Pay this penalty?</AlertDialogTitle>
                        <AlertDialogDescription>
                            The penalty is “{challan.penalty}”. Once it's paid,
                            this challan is settled for good.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Not yet</AlertDialogCancel>
                        <AlertDialogAction disabled={busy} onClick={handlePay}>
                            Pay penalty
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
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
