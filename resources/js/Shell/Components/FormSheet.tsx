import type { FormEvent, ReactNode } from 'react';
import { OverlayClose } from '@/components/ui/overlay-close';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetTitle,
} from '@/components/ui/sheet';
import { useDraftCloseGate } from '@/hooks/use-draft-close-gate';
import { useResponsiveSheet } from '@/hooks/use-responsive-sheet';
import { cn } from '@/lib/utils';
import DiscardDraftDialog from '@/Shell/Components/DiscardDraftDialog';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    isDirty: boolean;
    onDiscard?: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    /* The buttons; the single filled submit goes last, so it sits on the right. */
    footer: ReactNode;
    /* Says why the submit is disabled; the submit points at it with aria-describedby. */
    hint?: string | null;
    hintId?: string;
    discardTitle?: string;
    discardDescription?: string;
    /* The widest the side panel gets, in px. */
    width?: 560 | 640;
    children: ReactNode;
};

const PANEL_WIDTH = {
    560: 'w-[90vw] max-w-[560px] sm:max-w-[560px]',
    640: 'w-[90vw] max-w-[640px] sm:max-w-[640px]',
};

/*
 * The frame of every sheet that adds or changes something: from the right on a wide screen
 * and from the bottom on a phone, a title bar with a 44px close, a scrolling body, and a footer
 * that stays in view above the keyboard. Every way of closing asks before dropping a draft.
 */
export default function FormSheet({
    open,
    onOpenChange,
    title,
    description,
    isDirty,
    onDiscard,
    onSubmit,
    footer,
    hint,
    hintId,
    discardTitle = 'Discard your changes?',
    discardDescription = "What you entered here won't be saved.",
    width = 560,
    children,
}: Props) {
    const gate = useDraftCloseGate({
        open,
        isDirty,
        onClose: () => onOpenChange(false),
        onDiscard,
    });
    const { side, style, swipeHandlers } = useResponsiveSheet({
        open,
        onSwipeDismiss: gate.requestClose,
    });

    return (
        <>
            <Sheet open={open} onOpenChange={gate.onOpenChange}>
                <SheetContent
                    side={side}
                    showCloseButton={false}
                    className={cn(
                        'shell-form-sheet-content gap-0 shadow-lg',
                        side === 'right' && PANEL_WIDTH[width],
                        side === 'bottom' && 'h-[90dvh] w-full pb-0',
                    )}
                    style={style}
                >
                    <form
                        noValidate
                        onSubmit={onSubmit}
                        className="shell-form-sheet-form"
                    >
                        <div className="shell-form-sheet-header">
                            <SheetTitle className="shell-form-sheet-title">
                                {title}
                            </SheetTitle>
                            <SheetDescription className="sr-only">
                                {description}
                            </SheetDescription>
                        </div>

                        {/* Block scroller, no display:flex: iOS Safari freezes a flex + overflow:auto element. */}
                        <div
                            {...swipeHandlers}
                            className="shell-form-sheet-scroll"
                        >
                            <div className="shell-form-sheet-body">
                                {children}
                            </div>
                        </div>

                        <div className="shell-form-sheet-footer">
                            {hint && (
                                <p
                                    id={hintId}
                                    className="shell-form-sheet-hint"
                                >
                                    {hint}
                                </p>
                            )}
                            <div className="shell-form-sheet-actions">
                                {footer}
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
                description={discardDescription}
            />
        </>
    );
}
