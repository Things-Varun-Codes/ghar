import { useState } from 'react';
import type { ReactNode } from 'react';
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
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import SubmitButton from '@/Shell/Components/SubmitButton';

type ListAddDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    submitLabel: string;
    processing?: boolean;
    busyText?: string;
    renderFields: () => ReactNode;
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
    isDirty: () => boolean;
    discardConfirm?: {
        title: string;
        description: string;
        confirmLabel: string;
        cancelLabel: string;
    };
};

export default function ListAddDialog({
    open,
    onOpenChange,
    title,
    submitLabel,
    processing,
    busyText = 'Saving…',
    renderFields,
    onSubmit,
    isDirty,
    discardConfirm,
}: ListAddDialogProps) {
    const [confirmOpen, setConfirmOpen] = useState(false);

    const confirm = discardConfirm ?? {
        title: 'Discard your draft?',
        description: "Your draft will be lost. This can't be undone.",
        confirmLabel: 'Discard',
        cancelLabel: 'Keep editing',
    };

    const handleOpenChange = (next: boolean) => {
        if (!next && isDirty()) {
            setConfirmOpen(true);

            return;
        }

        onOpenChange(next);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent data-app="our-corner">
                    <DialogHeader>
                        <DialogTitle>{title}</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={onSubmit} className="flex flex-col gap-4">
                        {renderFields()}

                        <DialogFooter>
                            <SubmitButton
                                processing={processing}
                                busyText={busyText}
                            >
                                {submitLabel}
                            </SubmitButton>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent data-app="our-corner">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirm.title}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirm.description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>
                            {confirm.cancelLabel}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className={buttonVariants({
                                variant: 'destructive',
                            })}
                            onClick={() => {
                                setConfirmOpen(false);
                                onOpenChange(false);
                            }}
                        >
                            {confirm.confirmLabel}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
