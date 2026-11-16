import { useState } from 'react';
import { useOverlayHistory } from '@/hooks/use-overlay-history';
import type { OverlayParam } from '@/hooks/use-overlay-history';

type Options = {
    open: boolean;
    isDirty: boolean;
    onClose: () => void;
    /* Runs just before onClose when the person confirms the discard. */
    onDiscard?: () => void;
    /*
     * The caller's own prompt over the overlay (a delete confirm). Back closes it after the
     * discard prompt and before the overlay; return true when there was one to close.
     */
    closeNested?: () => boolean;
    param?: OverlayParam | null;
};

/**
 * The close path of an overlay that holds a draft. Every way out (close button, Escape, outside
 * click, back) goes through `requestClose`, which asks before throwing a dirty draft away. Back
 * answers the innermost question first: the discard prompt (as "keep editing"), then
 * `closeNested`, then the overlay itself. Render the prompt with
 * `<DiscardDraftDialog {...gate.prompt} />`.
 */
export function useDraftCloseGate({
    open,
    isDirty,
    onClose,
    onDiscard,
    closeNested,
    param = null,
}: Options) {
    const [promptOpen, setPromptOpen] = useState(false);

    const requestClose = () => {
        if (isDirty) {
            setPromptOpen(true);

            return;
        }

        onClose();
    };

    useOverlayHistory(
        open,
        () => {
            if (promptOpen) {
                setPromptOpen(false);
            } else if (!closeNested?.()) {
                requestClose();
            }
        },
        { param },
    );

    return {
        requestClose,
        /* For the overlay's Root: Radix asks to close on Escape, outside click and its Close. */
        onOpenChange: (next: boolean) => {
            if (!next) {
                requestClose();
            }
        },
        prompt: {
            open: promptOpen,
            onOpenChange: setPromptOpen,
            onDiscard: () => {
                setPromptOpen(false);
                onDiscard?.();
                onClose();
            },
        },
    };
}
