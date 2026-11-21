import { useFlashToast } from '@/hooks/use-flash-toast';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

/*
 * Sonner's own light theme, recoloured by the --normal-* tokens below so it follows ours;
 * its system theme would fight data-theme. The look lives in app.css under [data-sonner-toaster]; --shell-toast-bottom lifts the
 * stack clear of the FAB and the bottom bar.
 */
function Toaster({ ...props }: ToasterProps) {
    useFlashToast();

    return (
        <Sonner
            theme="light"
            className="toaster group"
            position="bottom-right"
            offset={{ bottom: 'var(--shell-toast-bottom)' }}
            mobileOffset={{
                bottom: 'var(--shell-toast-bottom)',
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
