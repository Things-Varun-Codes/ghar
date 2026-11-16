import type { VisitOptions } from '@inertiajs/core';
import * as Sentry from '@sentry/react';
import { toast } from 'sonner';

export const MUTATION_FAILED_MESSAGE = "Couldn't update that. Try again.";

type MutationContext = {
    /** Where the mutation lives, for the error report: 'Admin/ShortLinks'. */
    component: string;
    action: string;
    /** Called with true when the request starts and false when it settles, however it ends. */
    onPendingChange?: (pending: boolean) => void;
    message?: string;
};

type MutationCallbacks = Pick<
    VisitOptions,
    'onStart' | 'onFinish' | 'onError' | 'onNetworkError' | 'onHttpException'
>;

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
    const fail = (kind: string, detail: unknown) => {
        toast.error(message);
        Sentry.captureException(new Error(`${component} ${action}: ${kind}`), {
            tags: { component, action, surface: 'frontend' },
            extra: { detail },
        });
    };

    return {
        onStart: () => onPendingChange?.(true),
        onFinish: () => onPendingChange?.(false),
        // A validation error is the server answering, not a failure to report.
        onError: (errors) => {
            const first = Object.values(errors)[0];
            toast.error(typeof first === 'string' ? first : message);
        },
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
