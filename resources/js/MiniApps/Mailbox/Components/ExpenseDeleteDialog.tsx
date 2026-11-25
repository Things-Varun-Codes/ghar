import { router } from '@inertiajs/react';

import { mutationOptions } from '@/lib/mutation';
import { destroy } from '@/routes/apps/our-exchange/expenses';
import ConfirmDialog from '@/Shell/Components/ConfirmDialog';

type Props = {
    expense: { id: number; is_settlement: boolean };
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onPendingChange?: (pending: boolean) => void;
    onDeleted?: () => void;
};

/* Asks, then deletes an expense or a payment. The Activity tab can bring it back. */
export default function ExpenseDeleteDialog({
    expense,
    open,
    onOpenChange,
    onPendingChange,
    onDeleted,
}: Props) {
    const noun = expense.is_settlement ? 'payment' : 'expense';

    return (
        <ConfirmDialog
            open={open}
            onOpenChange={onOpenChange}
            title={`Delete this ${noun}?`}
            description="Everyone's balances change with it. You can restore it from the group's activity."
            cancelLabel="Keep it"
            confirmLabel="Delete"
            variant="destructive"
            onConfirm={() =>
                router.delete(destroy.url(expense.id), {
                    preserveScroll: true,
                    ...mutationOptions({
                        component: 'Mailbox/ExpenseDeleteDialog',
                        action: `${noun}.delete`,
                        onPendingChange,
                    }),
                    onSuccess: onDeleted,
                })
            }
        />
    );
}
