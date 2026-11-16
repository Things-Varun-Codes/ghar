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
import { cn } from '@/lib/utils';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDiscard: () => void;
    title: string;
    description: string;
    cancelLabel?: string;
    confirmLabel?: string;
    /* For a room that draws its own confirm dialogs. */
    classNames?: {
        content?: string;
        header?: string;
        title?: string;
        description?: string;
        footer?: string;
        cancel?: string;
        action?: string;
    };
};

/** The "throw this draft away?" prompt; driven by `useDraftCloseGate().prompt`. */
export default function DiscardDraftDialog({
    open,
    onOpenChange,
    onDiscard,
    title,
    description,
    cancelLabel = 'Keep editing',
    confirmLabel = 'Discard',
    classNames,
}: Props) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className={classNames?.content}>
                <AlertDialogHeader className={classNames?.header}>
                    <AlertDialogTitle className={classNames?.title}>
                        {title}
                    </AlertDialogTitle>
                    <AlertDialogDescription className={classNames?.description}>
                        {description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className={classNames?.footer}>
                    <AlertDialogCancel className={classNames?.cancel}>
                        {cancelLabel}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        className={cn(
                            buttonVariants({ variant: 'destructive' }),
                            classNames?.action,
                        )}
                        onClick={onDiscard}
                    >
                        {confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
