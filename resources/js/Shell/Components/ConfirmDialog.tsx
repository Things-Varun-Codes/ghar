import { Loader2 } from 'lucide-react';
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
import { cn } from '@/lib/utils';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    processing?: boolean;
    variant?: 'default' | 'destructive';
    /* For a room or page that draws its own confirm dialogs. */
    classNames?: {
        content?: string;
        header?: string;
        title?: string;
        description?: string;
        footer?: string;
        cancel?: string;
        action?: string;
    };
}

export default function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    processing = false,
    variant = 'default',
    classNames,
}: Props) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className={classNames?.content}>
                <AlertDialogHeader className={classNames?.header}>
                    <AlertDialogTitle className={classNames?.title}>
                        {title}
                    </AlertDialogTitle>
                    {description && (
                        <AlertDialogDescription
                            className={classNames?.description}
                        >
                            {description}
                        </AlertDialogDescription>
                    )}
                </AlertDialogHeader>
                <AlertDialogFooter className={classNames?.footer}>
                    <AlertDialogCancel
                        disabled={processing}
                        className={classNames?.cancel}
                    >
                        {cancelLabel}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        disabled={processing}
                        className={cn(
                            variant === 'destructive' &&
                                buttonVariants({ variant: 'destructive' }),
                            classNames?.action,
                        )}
                    >
                        {processing && (
                            <Loader2
                                className="mr-2 size-4 animate-spin"
                                aria-hidden="true"
                            />
                        )}
                        {confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
