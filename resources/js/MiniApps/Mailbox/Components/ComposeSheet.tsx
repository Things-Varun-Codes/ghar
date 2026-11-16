import * as SheetPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { useEffect, useState } from 'react';
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
import { useAllowTouchSelection } from '@/hooks/use-allow-touch-selection';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useOverlayHistory } from '@/hooks/use-overlay-history';
import { useSwipeDismiss } from '@/hooks/use-swipe-dismiss';
import { cn } from '@/lib/utils';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    isDirty: boolean;
    discardTitle: string;
    discardBody: string;
    onDiscard: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    /* The single filled submit goes last, so it sits on the right. */
    actions: ReactNode;
    /* Says why the submit is disabled; the submit points at it with aria-describedby. */
    hint?: string | null;
    hintId: string;
    children: ReactNode;
};

type ViewportMetrics = { height: number; offsetTop: number } | null;

/*
 * The frame every Mailbox compose sheet shares: a title bar with a 44px close, a scrolling
 * body, and a footer that stays in view (above the iOS keyboard too) with the submit in it.
 */
export default function ComposeSheet({
    open,
    onOpenChange,
    title,
    description,
    isDirty,
    discardTitle,
    discardBody,
    onDiscard,
    onSubmit,
    actions,
    hint,
    hintId,
    children,
}: Props) {
    const isWide = useMediaQuery('(min-width: 720px)');
    const side = isWide ? 'right' : 'bottom';
    const [discardOpen, setDiscardOpen] = useState(false);
    const keyboard = useKeyboardViewport(open && side === 'bottom');

    useBodyScrollLock(open);
    useAllowTouchSelection();

    const handleOpenChange = (next: boolean) => {
        if (!next && isDirty) {
            setDiscardOpen(true);

            return;
        }

        onOpenChange(next);
    };

    // Back closes the discard prompt first (as "keep editing"), then the sheet through its gate.
    useOverlayHistory(open, () =>
        discardOpen ? setDiscardOpen(false) : handleOpenChange(false),
    );

    const swipeHandlers = useSwipeDismiss({
        enabled: side === 'bottom',
        onDismiss: () => handleOpenChange(false),
    });

    return (
        <>
            <SheetPrimitive.Root open={open} onOpenChange={handleOpenChange}>
                <SheetPrimitive.Portal>
                    <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none" />
                    <SheetPrimitive.Content
                        data-app="our-mailbox"
                        data-scroll-container=""
                        className={cn(
                            'mailbox-sheet-content fixed z-50 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 motion-reduce:animate-none',
                            'data-[state=closed]:animate-out data-[state=open]:animate-in',
                            side === 'right' &&
                                'inset-y-0 right-0 h-full w-[90vw] max-w-[640px] border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
                            side === 'bottom' &&
                                'inset-x-0 bottom-0 h-[90dvh] w-full border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
                        )}
                        style={
                            keyboard
                                ? {
                                      top: `${keyboard.offsetTop}px`,
                                      bottom: 'auto',
                                      height: `${keyboard.height}px`,
                                  }
                                : undefined
                        }
                    >
                        <form
                            noValidate
                            onSubmit={onSubmit}
                            className="mailbox-sheet-form"
                        >
                            <div className="mailbox-sheet-header">
                                <SheetPrimitive.Title className="mailbox-sheet-title">
                                    {title}
                                </SheetPrimitive.Title>
                                <SheetPrimitive.Description className="sr-only">
                                    {description}
                                </SheetPrimitive.Description>
                            </div>

                            {/* Block scroller, no display:flex: iOS Safari freezes a flex + overflow:auto element. */}
                            <div
                                {...swipeHandlers}
                                className="mailbox-sheet-scroll"
                            >
                                <div className="mailbox-sheet-body">
                                    {children}
                                </div>
                            </div>

                            <div className="mailbox-sheet-footer">
                                {hint && (
                                    <p
                                        id={hintId}
                                        className="mailbox-sheet-hint"
                                    >
                                        {hint}
                                    </p>
                                )}
                                <div className="mailbox-sheet-actions">
                                    {actions}
                                </div>
                            </div>
                        </form>

                        {/* Last in the DOM so opening focuses the first field, not the close. */}
                        <SheetPrimitive.Close
                            className="mailbox-sheet-close"
                            aria-label="Close"
                        >
                            <X size={20} strokeWidth={1.5} aria-hidden="true" />
                        </SheetPrimitive.Close>
                    </SheetPrimitive.Content>
                </SheetPrimitive.Portal>
            </SheetPrimitive.Root>

            <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
                <AlertDialogContent data-app="our-mailbox">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{discardTitle}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {discardBody}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep editing</AlertDialogCancel>
                        <AlertDialogAction
                            className={buttonVariants({
                                variant: 'destructive',
                            })}
                            onClick={() => {
                                setDiscardOpen(false);
                                onDiscard();
                                onOpenChange(false);
                            }}
                        >
                            Discard
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

/*
 * iOS dvh does not shrink for the keyboard, so a bottom sheet would keep its footer under it.
 * visualViewport is the only signal for the covered area. Portrait only: a collapsing URL bar
 * in landscape reads like a keyboard.
 */
function useKeyboardViewport(active: boolean): ViewportMetrics {
    const [metrics, setMetrics] = useState<ViewportMetrics>(null);

    useEffect(() => {
        const vv = window.visualViewport;

        if (!active || !vv) {
            return;
        }

        const sync = () => {
            const keyboardUp =
                window.matchMedia('(orientation: portrait)').matches &&
                window.innerHeight - vv.height - vv.offsetTop > 100;

            setMetrics(
                keyboardUp
                    ? { height: vv.height, offsetTop: vv.offsetTop }
                    : null,
            );
        };

        sync();
        vv.addEventListener('resize', sync);
        vv.addEventListener('scroll', sync);

        return () => {
            vv.removeEventListener('resize', sync);
            vv.removeEventListener('scroll', sync);
            setMetrics(null);
        };
    }, [active]);

    return metrics;
}
