import { Eye, EyeOff } from 'lucide-react';
import type { ComponentProps, Ref } from 'react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function PasswordInput({
    className,
    ref,
    ...props
}: Omit<ComponentProps<'input'>, 'type'> & { ref?: Ref<HTMLInputElement> }) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="relative">
            <Input
                type={showPassword ? 'text' : 'password'}
                className={cn('pr-12', className)}
                ref={ref}
                {...props}
            />
            <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="shell-focus absolute top-1/2 right-0 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                aria-label="Show password"
                aria-pressed={showPassword}
            >
                {showPassword ? (
                    <EyeOff
                        className="size-5"
                        strokeWidth={1.5}
                        aria-hidden="true"
                    />
                ) : (
                    <Eye
                        className="size-5"
                        strokeWidth={1.5}
                        aria-hidden="true"
                    />
                )}
            </button>
        </div>
    );
}
