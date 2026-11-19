import { router } from '@inertiajs/react';
import { useState } from 'react';

import { mutationOptions } from '@/lib/mutation';
import type { CitationPayload } from '@/MiniApps/Mailbox/Components/CitationCard';
import { destroy, pay } from '@/routes/apps/our-exchange/citations';
import ConfirmDialog from '@/Shell/Components/ConfirmDialog';
import SubmitButton from '@/Shell/Components/SubmitButton';

type Pending = 'pay' | 'delete' | null;

export default function CitationActions({
    citation,
    variant = 'detail',
}: {
    citation: CitationPayload;
    variant?: 'row' | 'detail';
}) {
    const [pending, setPending] = useState<Pending>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [payOpen, setPayOpen] = useState(false);

    const actions = citation.available_actions;
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
            pay.url(citation.id),
            {},
            {
                preserveScroll: true,
                ...mutationOptions({
                    component: 'Mailbox/CitationActions',
                    action: 'citation.pay',
                    onPendingChange: (p) => setPending(p ? 'pay' : null),
                }),
            },
        );
    };

    const handleDelete = () => {
        if (busy) {
            return;
        }

        router.delete(destroy.url(citation.id), {
            preserveScroll: true,
            ...mutationOptions({
                component: 'Mailbox/CitationActions',
                action: 'citation.delete',
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
                                ? `Pay penalty for “${citation.offence}”`
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
                                ? `Withdraw “${citation.offence}”`
                                : undefined
                        }
                        className="mailbox-btn-neutral mailbox-btn-danger"
                    >
                        Withdraw
                    </SubmitButton>
                )}
            </div>

            <ConfirmDialog
                open={payOpen}
                onOpenChange={setPayOpen}
                title="Pay this penalty?"
                description={`The penalty is “${citation.penalty}”. Once it's paid, this citation is settled for good.`}
                cancelLabel="Not yet"
                confirmLabel="Pay penalty"
                onConfirm={handlePay}
            />

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Withdraw this citation?"
                description="This removes it for them too. There's no undo."
                cancelLabel="Keep it"
                confirmLabel="Withdraw"
                variant="destructive"
                onConfirm={handleDelete}
            />
        </>
    );
}
