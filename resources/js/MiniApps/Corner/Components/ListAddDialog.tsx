import type { ReactNode } from 'react';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useDraftCloseGate } from '@/hooks/use-draft-close-gate';
import DiscardDraftDialog from '@/Shell/Components/DiscardDraftDialog';
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
    isDirty: boolean;
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
}: ListAddDialogProps) {
    const gate = useDraftCloseGate({
        open,
        isDirty,
        onClose: () => onOpenChange(false),
    });

    return (
        <>
            <Dialog open={open} onOpenChange={gate.onOpenChange}>
                <DialogContent>
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

            <DiscardDraftDialog
                {...gate.prompt}
                title="Discard your draft?"
                description="What you entered here won't be saved."
            />
        </>
    );
}
