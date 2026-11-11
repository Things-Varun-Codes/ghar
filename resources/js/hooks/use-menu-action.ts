/*
 * Runs a menu item's action after the menu closes. Opening a dialog straight from onSelect leaves
 * the menu's pointer-events lock on body.
 */
import { useCallback, useRef } from 'react';

export function useMenuAction() {
    const pending = useRef<(() => void) | null>(null);

    const defer = useCallback(
        (action: () => void) => () => {
            pending.current = action;
        },
        [],
    );

    const onCloseAutoFocus = useCallback(() => {
        const action = pending.current;
        pending.current = null;
        action?.();
    }, []);

    return { defer, onCloseAutoFocus };
}
