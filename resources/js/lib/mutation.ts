import type { VisitOptions } from '@inertiajs/core';
import * as Sentry from '@sentry/react';
import { toast } from 'sonner';

export const MUTATION_FAILED_MESSAGE = "Couldn't update that. Try again.";

type TransportFailureContext = {
    /** Where the visit lives, for the error report: 'Admin/ShortLinks'. */
    component: string;
    action: string;
    message?: string;
    /** Runs before the toast: undo an optimistic change. */
    onFailed?: () => void;
};

type TransportFailureCallbacks = Pick<
    VisitOptions,
    'onNetworkError' | 'onHttpException'
>;

/**
 * Transport failures and error statuses never reach a validation `onError`. Each toasts and
 * is reported; returning false keeps Inertia's error modal and the unhandled rejection away.
 */
export function transportFailureOptions({
    component,
    action,
    message = MUTATION_FAILED_MESSAGE,
    onFailed,
}: TransportFailureContext): TransportFailureCallbacks {
    const fail = (kind: string, detail: unknown) => {
        onFailed?.();
        toast.error(message);
        Sentry.captureException(new Error(`${component} ${action}: ${kind}`), {
            tags: { component, action, surface: 'frontend' },
            extra: { detail },
        });
    };

    return {
        onNetworkError: (error) => {
            fail('network-error', error.message);

            return false;
        },
        onHttpException: (response) => {
            fail('http-exception', response.status);

            return false;
        },
    };
}

export const SAVE_FAILED_MESSAGE = "Couldn't save that. Try again.";

type FormSubmitContext = {
    component: string;
    action: string;
    /** Whether the form shows the error for this key beside a field. */
    isShownField: (key: string) => boolean;
    /** Toasted when the save fails without a message of its own. */
    message?: string;
    onSuccess?: VisitOptions['onSuccess'];
};

type FormSubmitCallbacks = Pick<VisitOptions, 'onSuccess' | 'onError'> &
    TransportFailureCallbacks;

/**
 * Failure handling for a form's submit, spread into `form.post(url, { … })`. A field's error
 * shows beside it, so it isn't toasted; one the form has no field for is. Every rejection is
 * reported by its keys only, never what was typed. A transport failure or an error status
 * toasts, is reported, and doesn't raise Inertia's error modal.
 */
export function formSubmitOptions({
    component,
    action,
    isShownField,
    message = SAVE_FAILED_MESSAGE,
    onSuccess,
}: FormSubmitContext): FormSubmitCallbacks {
    return {
        onSuccess,
        onError: (errors) => {
            const unshown = Object.entries(errors).find(
                ([key]) => !isShownField(key),
            );

            if (unshown) {
                toast.error(
                    typeof unshown[1] === 'string' && unshown[1] !== ''
                        ? unshown[1]
                        : message,
                );
            }

            Sentry.captureException(new Error(`${action} rejected`), {
                tags: { component, action, surface: 'frontend' },
                extra: { validation_keys: Object.keys(errors) },
            });
        },
        ...transportFailureOptions({ component, action, message }),
    };
}

type MutationContext = {
    component: string;
    action: string;
    /** Called with true when the request starts and false when it settles, however it ends. */
    onPendingChange?: (pending: boolean) => void;
    message?: string;
};

type MutationCallbacks = Pick<
    VisitOptions,
    'onStart' | 'onFinish' | 'onError'
> &
    TransportFailureCallbacks;

/**
 * The pending flag and failure handling every one-tap mutation needs (a toggle, a pay, a
 * request). Spread it into the visit options and disable the control while pending:
 *
 *     router.patch(url, data, { preserveScroll: true, ...mutationOptions({ … }) })
 *
 * A validation error toasts the server's message. A transport failure or an error status
 * toasts, is reported, and doesn't raise Inertia's error modal.
 */
export function mutationOptions({
    component,
    action,
    onPendingChange,
    message = MUTATION_FAILED_MESSAGE,
}: MutationContext): MutationCallbacks {
    return {
        onStart: () => onPendingChange?.(true),
        onFinish: () => onPendingChange?.(false),
        // A validation error is the server answering, not a failure to report.
        onError: (errors) => {
            const first = Object.values(errors)[0];
            toast.error(typeof first === 'string' ? first : message);
        },
        ...transportFailureOptions({ component, action, message }),
    };
}
