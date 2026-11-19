import { cloneElement, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Reveal } from '@/components/motion';
import {
    FieldDescription,
    FieldError,
    FieldLabel,
} from '@/components/ui/field';

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
        <div className={wrapperClass} data-slot="form-field">
            <FieldLabel htmlFor={labelFor}>
                {label}
                {required && (
                    <span
                        aria-hidden="true"
                        className="ml-0.5 text-(--destructive)"
                    >
                        *
                    </span>
                )}
            </FieldLabel>
            {childWithAria}
            <Reveal show={Boolean(error)}>
                <FieldError id={errorId} className="mt-1">
                    {error}
                </FieldError>
            </Reveal>
            {helper && (
                <FieldDescription id={helperId} className="mt-1">
                    {helper}
                </FieldDescription>
            )}
        </div>
    );
}
