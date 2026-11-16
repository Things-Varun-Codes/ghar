import * as React from 'react';
import { cn } from '@/lib/utils';

function Textarea({
    className,
    ...props
}: React.ComponentProps<'textarea'>) {
    return (
        <textarea
            data-slot="textarea"
            className={cn(
                'shell-field border-input placeholder:text-muted-foreground aria-invalid:border-destructive flex field-sizing-content min-h-[120px] w-full border bg-transparent px-3.5 py-3 text-base outline-none disabled:cursor-not-allowed disabled:opacity-50',
                className,
            )}
            {...props}
        />
    );
}

export { Textarea };
