import type { CSSProperties } from 'react';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';
import { useHasSidebar, useIsPhone } from '@/hooks/use-breakpoint';
import { useKeyboardViewport } from '@/hooks/use-keyboard-viewport';
import { useSwipeDismiss } from '@/hooks/use-swipe-dismiss';

type Options = {
    open: boolean;
    /* Where the sheet stops rising from the bottom and slides in from the right instead. */
    panelFrom?: 'md' | 'lg';
    /* A pull down on the body closes the bottom sheet; without it the swipe does nothing. */
    onSwipeDismiss?: () => void;
};

/*
 * What every sheet that holds a form needs: a bottom sheet on a narrow screen and a side panel
 * on a wide one, the page behind held still, and on a phone a height that follows the
 * on-screen keyboard so the footer stays in view.
 */
export function useResponsiveSheet({
    open,
    panelFrom = 'md',
    onSwipeDismiss,
}: Options) {
    const isPhone = useIsPhone();
    const hasSidebar = useHasSidebar();
    const side: 'right' | 'bottom' = (
        panelFrom === 'lg' ? hasSidebar : !isPhone
    )
        ? 'right'
        : 'bottom';
    const keyboard = useKeyboardViewport(open && side === 'bottom');

    useBodyScrollLock(open);

    const swipeHandlers = useSwipeDismiss({
        enabled: side === 'bottom' && onSwipeDismiss !== undefined,
        onDismiss: () => onSwipeDismiss?.(),
    });

    const style: CSSProperties | undefined = keyboard
        ? {
              top: `${keyboard.offsetTop}px`,
              bottom: 'auto',
              height: `${keyboard.height}px`,
          }
        : undefined;

    return { side, style, swipeHandlers };
}
