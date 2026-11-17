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
    onDiscard?: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    /* The submit, last so it sits on the right. */
    footer: ReactNode;
    children: ReactNode;
};

/*
 * The frame Corner's add, edit and list-settings sheets share: from the right on a wide screen
 * and from the bottom on a phone, a title bar with a 44px close, a scrolling body, and a footer
 * that stays in view above the keyboard. Every way of closing asks before dropping a draft.
 */
export default function CornerSheet({
    open,
    onOpenChange,
    title,
    description,
    isDirty,
    onDiscard,
    onSubmit,
    footer,
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
                        'corner-sheet-content gap-0 shadow-lg',
                        side === 'right' &&
                            'w-[90vw] max-w-[560px] sm:max-w-[560px]',
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
                        className="corner-sheet-form"
                    >
                        <div className="corner-sheet-header">
                            <SheetTitle className="corner-sheet-title">
                                {title}
                            </SheetTitle>
                            <SheetDescription className="sr-only">
                                {description}
                            </SheetDescription>
                        </div>

                        {/* Block scroller, no display:flex: iOS Safari freezes a flex + overflow:auto element. */}
                        <div {...swipeHandlers} className="corner-sheet-scroll">
                            <div className="corner-sheet-body">{children}</div>
                        </div>

                        <div className="corner-sheet-footer">{footer}</div>
                    </form>

                    {/* Last in the DOM so opening focuses the first field, not the close. */}
                    <OverlayClose className="top-3 right-3" />
                </SheetContent>
            </Sheet>

            <DiscardDraftDialog
                {...gate.prompt}
                title="Discard your changes?"
                description="What you entered here won't be saved."
            />
        </>
    );
}
