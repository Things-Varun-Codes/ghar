import { useFlashToast } from '@/hooks/use-flash-toast';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

/*
 * Light only: sonner's system theme would render dark toasts on system-dark devices.
 * The look lives in app.css under [data-sonner-toaster]. On phones the stack sits above
 * the FAB rather than in its corner.
 */
function Toaster({ ...props }: ToasterProps) {
    useFlashToast();

    return (
        <Sonner
            theme="light"
            className="toaster group"
            position="bottom-right"
            mobileOffset={{
                bottom: 'calc(96px + env(safe-area-inset-bottom))',
                left: 'max(16px, env(safe-area-inset-left))',
                right: 'max(16px, env(safe-area-inset-right))',
            }}
            style={
                {
                    '--normal-bg': 'var(--popover)',
                    '--normal-text': 'var(--popover-foreground)',
                    '--normal-border': 'var(--border)',
                    '--border-radius': 'var(--radius-pop)',
                } as React.CSSProperties
            }
            {...props}
        />
    );
}

export { Toaster };
