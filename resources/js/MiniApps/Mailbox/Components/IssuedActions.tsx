import { router } from '@inertiajs/react';
import { useState } from 'react';

import { mutationOptions } from '@/lib/mutation';
import ConfirmDialog from '@/Shell/Components/ConfirmDialog';
import SubmitButton from '@/Shell/Components/SubmitButton';

export type IssuedAction = {
    kind: string;
    label: string;
    busyText: string;
    /** Rows repeat down the list, so a row's button reads "{verb} “{subject}”". */
    verb: string;
    url: string;
    tone: 'primary' | 'neutral';
    confirm?: {
        title: string;
        description: string;
        cancelLabel: string;
        confirmLabel: string;
    };
};

type Props = {
    noun: 'citation' | 'coupon';
    subject: string;
    variant: 'row' | 'detail';
    actions: IssuedAction[];
    /** Set when the viewer may withdraw it. */
    deleteUrl?: string;
};

export default function IssuedActions({
    noun,
    subject,
    variant,
    actions,
    deleteUrl,
}: Props) {
    const [pending, setPending] = useState<string | null>(null);
    const [confirming, setConfirming] = useState<string | null>(null);

    if (actions.length === 0 && !deleteUrl) {
        return null;
    }

    const component = `Mailbox/${noun === 'citation' ? 'Citation' : 'Coupon'}Actions`;
    const isRow = variant === 'row';
    const size = isRow ? 'sm' : 'default';
    const busy = pending !== null;
    const named = (verb: string) =>
        isRow ? `${verb} “${subject}”` : undefined;

    const patch = (action: IssuedAction) => {
        if (busy) {
            return;
        }

        router.patch(
            action.url,
            {},
            {
                preserveScroll: true,
                // Kept mounted, so the form's stamp sees its status change and scales in.
                preserveState: true,
                ...mutationOptions({
                    component,
                    action: `${noun}.${action.kind}`,
                    onPendingChange: (p) => setPending(p ? action.kind : null),
                }),
            },
        );
    };

    const withdraw = (url: string) => {
        if (busy) {
            return;
        }

        router.delete(url, {
            preserveScroll: true,
            ...mutationOptions({
                component,
                action: `${noun}.delete`,
                onPendingChange: (p) => {
                    setPending(p ? 'delete' : null);

                    if (!p) {
                        setConfirming(null);
                    }
                },
            }),
        });
    };

    return (
        <>
            <div className="flex flex-wrap gap-2">
                {actions.map((action) => (
                    <SubmitButton
                        key={action.kind}
                        type="button"
                        variant={
                            action.tone === 'neutral' ? 'outline' : undefined
                        }
                        size={size}
                        processing={pending === action.kind}
                        disabled={busy}
                        busyText={action.busyText}
                        onClick={() =>
                            action.confirm
                                ? setConfirming(action.kind)
                                : patch(action)
                        }
                        aria-label={named(action.verb)}
                        className={
                            action.tone === 'neutral'
                                ? 'mailbox-btn-neutral'
                                : isRow
                                  ? 'mailbox-btn-primary-row'
                                  : 'mailbox-btn-primary'
                        }
                    >
                        {action.label}
                    </SubmitButton>
                ))}
                {deleteUrl && (
                    <SubmitButton
                        type="button"
                        variant="outline"
                        size={size}
                        processing={pending === 'delete'}
                        disabled={busy}
                        busyText="Withdrawing…"
                        onClick={() => setConfirming('delete')}
                        aria-label={named('Withdraw')}
                        className="mailbox-btn-neutral mailbox-btn-danger"
                    >
                        Withdraw
                    </SubmitButton>
                )}
            </div>

            {actions.map(
                (action) =>
                    action.confirm && (
                        <ConfirmDialog
                            key={action.kind}
                            open={confirming === action.kind}
                            onOpenChange={(open) =>
                                setConfirming(open ? action.kind : null)
                            }
                            {...action.confirm}
                            onConfirm={() => patch(action)}
                        />
                    ),
            )}

            {deleteUrl && (
                <ConfirmDialog
                    open={confirming === 'delete'}
                    onOpenChange={(open) =>
                        setConfirming(open ? 'delete' : null)
                    }
                    title={`Withdraw this ${noun}?`}
                    description="This removes it for them too. There's no undo."
                    cancelLabel="Keep it"
                    confirmLabel="Withdraw"
                    variant="destructive"
                    onConfirm={() => withdraw(deleteUrl)}
                />
            )}
        </>
    );
}
