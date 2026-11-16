import { useCallback, useRef } from 'react';

type AutoFocusHandler = (event: Event) => void;

/**
 * Radix sends focus back to a Dialog.Trigger on close, and to <body> when there isn't one,
 * which is how most of our dialogs open. This remembers what had focus when the dialog
 * opened and returns focus there on close. A caller's own handler runs first; if it calls
 * preventDefault() it has taken over and nothing more happens.
 */
export function useReturnFocus(handlers?: {
    onOpenAutoFocus?: AutoFocusHandler;
    onCloseAutoFocus?: AutoFocusHandler;
}): { onOpenAutoFocus: AutoFocusHandler; onCloseAutoFocus: AutoFocusHandler } {
    const trigger = useRef<HTMLElement | null>(null);
    const onOpen = handlers?.onOpenAutoFocus;
    const onClose = handlers?.onCloseAutoFocus;

    const onOpenAutoFocus = useCallback(
        (event: Event) => {
            const active = document.activeElement;
            trigger.current =
                active instanceof HTMLElement && active !== document.body
                    ? active
                    : null;
            onOpen?.(event);
        },
        [onOpen],
    );

    const onCloseAutoFocus = useCallback(
        (event: Event) => {
            onClose?.(event);

            const target = trigger.current;
            trigger.current = null;

            if (event.defaultPrevented || !target || !target.isConnected) {
                return;
            }

            event.preventDefault();
            target.focus();
        },
        [onClose],
    );

    return { onOpenAutoFocus, onCloseAutoFocus };
}
