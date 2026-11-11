import { Loader2 } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

type Props = ComponentProps<typeof Button> & {
    processing?: boolean;
    busyText: string; // REQUIRED — omitting triggers TypeScript compile error
    children: ReactNode;
};

export default function SubmitButton({
    processing,
    disabled,
    busyText,
    children,
    type = 'submit',
    ...rest
}: Props) {
    return (
        <Button type={type} disabled={disabled || processing} {...rest}>
            {processing ? (
                <>
                    <Loader2
                        className="mr-2 size-4 animate-spin"
                        aria-hidden="true"
                    />
                    {busyText}
                </>
            ) : (
                children
            )}
        </Button>
    );
}
