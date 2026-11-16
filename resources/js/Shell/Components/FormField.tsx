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

    // Both the helper and the error describe the field; the error reads first.
    const describedBy =
        [error ? errorId : null, helper ? helperId : null]
            .filter(Boolean)
            .join(' ') || undefined;

    const wrapperClass = [
        // iOS-zoom guard + touch-target floor
        '[&_input]:min-h-[44px] [&_input]:text-base',
        '[&_select]:min-h-[44px] [&_select]:text-base',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    const child = isValidElement(children)
        ? (children as ReactElement<Record<string, unknown>>)
        : null;
    const ownDescribedBy = child?.props['aria-describedby'] as
        string | undefined;
    const childWithAria =
        child && describedBy
            ? cloneElement(child, {
                  'aria-describedby': [describedBy, ownDescribedBy]
                      .filter(Boolean)
                      .join(' '),
                  ...(error ? { 'aria-invalid': true } : {}),
              })
            : children;

    return (
        <div className={wrapperClass}>
            <label
                htmlFor={labelFor}
                className="mb-1.5 block text-[14px] font-medium text-(--foreground)"
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
            {helper && (
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
