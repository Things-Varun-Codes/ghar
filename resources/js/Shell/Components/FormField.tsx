import { cloneElement, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';

interface Props {
    label: string;
    name: string;
    error?: string;
    helper?: string;
    htmlFor?: string;
    required?: boolean;
    className?: string;
    children: ReactNode;
}

export default function FormField({
    label,
    name,
    error,
    helper,
    htmlFor,
    required,
    className,
    children,
}: Props) {
    const labelFor = htmlFor ?? name;

    const errorId = `${name}-error`;
    const helperId = `${name}-helper`;

    const describedBy = error ? errorId : helper ? helperId : undefined;

    const wrapperClass = [
        // iOS-zoom guard + touch-target floor
        '[&_input]:min-h-[44px] [&_input]:text-base',
        '[&_select]:min-h-[44px] [&_select]:text-base',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    const childWithAria =
        isValidElement(children) && describedBy
            ? cloneElement(children as ReactElement<Record<string, unknown>>, {
                  'aria-describedby': describedBy,
                  ...(error ? { 'aria-invalid': true } : {}),
              })
            : children;

    return (
        <div className={wrapperClass}>
            <label
                htmlFor={labelFor}
                className="mb-1.5 block text-[14px] font-semibold text-(--foreground)"
            >
                {label}
                {required && (
                    <span
                        aria-hidden="true"
                        className="ml-0.5 text-(--destructive)"
                    >
                        *
                    </span>
                )}
            </label>
            {childWithAria}
            {error && (
                <p
                    id={errorId}
                    role="alert"
                    className="mt-1 text-(length:--text-small) font-normal text-(--destructive)"
                >
                    {error}
                </p>
            )}
            {!error && helper && (
                <p
                    id={helperId}
                    className="mt-1 text-(length:--text-small) font-normal text-(--muted-foreground)"
                >
                    {helper}
                </p>
            )}
        </div>
    );
}
