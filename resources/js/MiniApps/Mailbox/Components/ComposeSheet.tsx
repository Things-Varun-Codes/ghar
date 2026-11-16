import type { FormEvent, ReactNode } from 'react';
import { OverlayClose } from '@/components/ui/overlay-close';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetTitle,
} from '@/components/ui/sheet';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';
import { useDraftCloseGate } from '@/hooks/use-draft-close-gate';
import { useKeyboardViewport } from '@/hooks/use-keyboard-viewport';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useSwipeDismiss } from '@/hooks/use-swipe-dismiss';
import { cn } from '@/lib/utils';
import DiscardDraftDialog from '@/Shell/Components/DiscardDraftDialog';

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
    const keyboard = useKeyboardViewport(open && side === 'bottom');

    useBodyScrollLock(open);

    const gate = useDraftCloseGate({
        open,
        isDirty,
        onClose: () => onOpenChange(false),
        onDiscard,
    });

    const swipeHandlers = useSwipeDismiss({
        enabled: side === 'bottom',
        onDismiss: gate.requestClose,
    });

    return (
        <>
            <Sheet open={open} onOpenChange={gate.onOpenChange}>
                <SheetContent
                    side={side}
                    showCloseButton={false}
                    className={cn(
                        'mailbox-sheet-content gap-0 shadow-lg',
                        side === 'right' &&
                            'w-[90vw] max-w-[640px] sm:max-w-[640px]',
                        side === 'bottom' && 'h-[90dvh] w-full pb-0',
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
                            <SheetTitle className="mailbox-sheet-title">
                                {title}
                            </SheetTitle>
                            <SheetDescription className="sr-only">
                                {description}
                            </SheetDescription>
                        </div>

                        {/* Block scroller, no display:flex: iOS Safari freezes a flex + overflow:auto element. */}
                        <div
                            {...swipeHandlers}
                            className="mailbox-sheet-scroll"
                        >
                            <div className="mailbox-sheet-body">{children}</div>
                        </div>

                        <div className="mailbox-sheet-footer">
                            {hint && (
                                <p id={hintId} className="mailbox-sheet-hint">
                                    {hint}
                                </p>
                            )}
                            <div className="mailbox-sheet-actions">
                                {actions}
                            </div>
                        </div>
                    </form>

                    {/* Last in the DOM so opening focuses the first field, not the close. */}
                    <OverlayClose className="top-3 right-3" />
                </SheetContent>
            </Sheet>

            <DiscardDraftDialog
                {...gate.prompt}
                title={discardTitle}
                description={discardBody}
            />
        </>
    );
}
