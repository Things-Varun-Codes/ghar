import { Eye, EyeOff } from 'lucide-react';
import type { ComponentProps, Ref } from 'react';
import { useState } from 'react';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
} from '@/components/ui/input-group';
import { cn } from '@/lib/utils';

/* A password field with a show/hide button inside its frame. */
export default function PasswordInput({
    className,
    ref,
    ...props
}: Omit<ComponentProps<'input'>, 'type'> & { ref?: Ref<HTMLInputElement> }) {
    const [showPassword, setShowPassword] = useState(false);
    const Icon = showPassword ? EyeOff : Eye;

    return (
        <InputGroup className={cn('shell-password-group', className)}>
            <InputGroupInput
                type={showPassword ? 'text' : 'password'}
                ref={ref}
                {...props}
            />
            <InputGroupAddon align="inline-end">
                <InputGroupButton
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label="Show password"
                    aria-pressed={showPassword}
                    className="text-muted-foreground hover:text-foreground"
                >
                    <Icon
                        className="size-5"
                        strokeWidth={1.5}
                        aria-hidden="true"
                    />
                </InputGroupButton>
            </InputGroupAddon>
        </InputGroup>
    );
}
