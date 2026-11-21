import { router } from '@inertiajs/react';
import * as Sentry from '@sentry/react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import {
    MUTATION_FAILED_MESSAGE,
    transportFailureOptions,
} from '@/lib/mutation';

import { destroy, toggleDone } from '@/routes/apps/our-shelf/items';

/* Our own timer: whether sonner fires onDismiss on an action click is unverified. */
export const DELETE_GRACE_PERIOD_MS = 5000;

export type UseItemActionsOptions = {
    id: number;
    title: string;
    /* Shown, with Undo, once a toggle lands: for a card the toggle takes out of view. */
    toggledMessage?: string;
    /* Runs last: the toast must exist before a detail page navigates away. */
    onDeleted?: () => void;
};

export type UseItemActionsReturn = {
    isPendingDelete: boolean;
    /* A toggle is in flight; the control ignores taps until it settles. */
    isTogglePending: boolean;
    handleToggleDone: () => void;
    handleDelete: () => void;
};

const COMPONENT = 'Corner/useItemActions';

type PendingDelete = {
    timerId: ReturnType<typeof setTimeout>;
    toastId: string | number;
};

export function useItemActions({
    id,
    title,
    toggledMessage,
    onDeleted,
}: UseItemActionsOptions): UseItemActionsReturn {
    const [isPendingDelete, setIsPendingDelete] = useState(false);
    const [isTogglePending, setIsTogglePending] = useState(false);
    const toggleInFlightRef = useRef(false);

    const pendingRef = useRef<PendingDelete | null>(null);

    const toggle = (message?: string) => {
        // A ref, not the state: a double tap lands before the re-render that would disable it.
        if (toggleInFlightRef.current) {
            return;
        }

        toggleInFlightRef.current = true;
        setIsTogglePending(true);

        router.patch(
            toggleDone.url(id),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    if (message) {
                        toast(message, {
                            action: { label: 'Undo', onClick: () => toggle() },
                        });
                    }
                },
                // Nothing to fill in, so a rejection is unexpected: reported, like the delete's.
                onError: (errors) => {
                    Sentry.captureException(new Error('toggle-done rejected'), {
                        tags: { component: COMPONENT, action: 'toggle-done' },
                        extra: { errors },
                    });
                    toast.error(MUTATION_FAILED_MESSAGE);
                },
                ...transportFailureOptions({
                    component: COMPONENT,
                    action: 'toggle-done',
                }),
                onFinish: () => {
                    toggleInFlightRef.current = false;
                    setIsTogglePending(false);
                },
            },
        );
    };

    const handleToggleDone = () => toggle(toggledMessage);

    const undo = () => {
        const pending = pendingRef.current;

        if (!pending) {
            return;
        }

        clearTimeout(pending.timerId);
        toast.dismiss(pending.toastId);
        pendingRef.current = null;
        setIsPendingDelete(false);
    };

    const handleDelete = () => {
        setIsPendingDelete(true);

        const timerId = setTimeout(() => {
            pendingRef.current = null;
            const message = `Couldn't remove ${title}. Try again.`;
            // Still on the list, the row comes back; a detail page has already left.
            const restore = () => setIsPendingDelete(false);

            router.delete(destroy.url(id), {
                preserveScroll: true,
                onError: (errors) => {
                    Sentry.captureException(new Error('delete rejected'), {
                        tags: { component: COMPONENT, action: 'delete' },
                        extra: { errors },
                    });
                    restore();
                    toast.error(message);
                },
                ...transportFailureOptions({
                    component: COMPONENT,
                    action: 'delete',
                    message,
                    onFailed: restore,
                }),
            });
        }, DELETE_GRACE_PERIOD_MS);

        const toastId = toast(`Removed ${title}`, {
            duration: DELETE_GRACE_PERIOD_MS,
            action: {
                label: 'Undo',
                onClick: undo,
            },
        });

        pendingRef.current = { timerId, toastId };

        // After the toast exists: on a detail page this navigates away, and the toast must survive it.
        onDeleted?.();
    };

    return {
        isPendingDelete,
        isTogglePending,
        handleToggleDone,
        handleDelete,
    };
}
