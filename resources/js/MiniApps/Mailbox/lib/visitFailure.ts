import * as Sentry from '@sentry/react';
import { toast } from 'sonner';

export const SEND_FAILED_MESSAGE = "Couldn't send that. Try again.";

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
