import * as Sentry from '@sentry/react';
import { toast } from 'sonner';

export const SEND_FAILED_MESSAGE = "Couldn't send that. Try again.";

type Ctx = { component: string; action: string; message: string };

/*
 * Transport and HTTP failures never reach a validation onError. Returning false keeps
 * Inertia's error modal and the unhandled rejection away: the toast is the surface.
 */
export function transportFailure({ component, action, message }: Ctx) {
    const tags = { component, action, surface: 'frontend' };

    return {
        onNetworkError: (error: Error) => {
            Sentry.captureException(error, { tags });
            toast.error(message);

            return false;
        },
        onHttpException: (response: { status: number }) => {
            Sentry.captureException(
                new Error(`${action} failed with HTTP ${response.status}`),
                { tags },
            );
            toast.error(message);

            return false;
        },
    };
}

/* Field errors render inline; anything the form has no field for becomes a toast. */
export function toastUnshownErrors(
    errors: Record<string, string>,
    shown: (key: string) => boolean,
    fallback: string,
): void {
    const unshown = Object.entries(errors).find(([key]) => !shown(key));

    if (unshown) {
        toast.error(unshown[1] || fallback);
    }
}

/* Reports a rejected submit without a toast: the fields already show what's wrong. */
export function reportRejected(
    component: string,
    action: string,
    errors: Record<string, string>,
): void {
    Sentry.captureException(new Error(`${action} rejected`), {
        tags: { component, action, surface: 'frontend' },
        extra: { validation_keys: Object.keys(errors) },
    });
}
