import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
    message: string;
    cause?: string;
    onRetry?: () => void;
    variant?: 'default' | 'inline';
};

const GEOMETRY: Record<NonNullable<Props['variant']>, string> = {
    default: 'mx-auto mt-16 mb-0 max-w-[320px]',
    inline: 'm-0 max-w-full py-3',
};

export default function ErrorState({
    message,
    cause,
    onRetry,
    variant = 'default',
}: Props) {
    return (
        <div
            className={cn(
                'flex flex-col items-center text-center',
                GEOMETRY[variant],
            )}
            role="alert"
        >
            {variant === 'default' && (
                <AlertCircle
                    size={40}
                    strokeWidth={1.5}
                    aria-hidden="true"
                    className="text-(--shell-destructive)"
                />
            )}
            <p
                className={cn(
                    variant === 'inline'
                        ? 'leading-tight'
                        : 'mt-4 leading-tight',
                    'font-semibold text-(--shell-text)',
                )}
                style={{ fontSize: variant === 'inline' ? '14px' : '18px' }}
            >
                {message}
            </p>
            {cause && (
                <p
                    className="mt-2 leading-[1.5] text-(--shell-text-muted)"
                    style={{ fontSize: variant === 'inline' ? '13px' : '14px' }}
                >
                    {cause}
                </p>
            )}
            {onRetry && (
                <Button
                    type="button"
                    variant="outline"
                    size={variant === 'inline' ? 'sm' : 'default'}
                    className={variant === 'inline' ? 'mt-2' : 'mt-4'}
                    onClick={onRetry}
                >
                    Try again
                </Button>
            )}
        </div>
    );
}
