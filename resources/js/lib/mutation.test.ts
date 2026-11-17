import * as Sentry from '@sentry/react';
import { toast } from 'sonner';
import { describe, expect, it, vi } from 'vitest';
import {
    formSubmitOptions,
    MUTATION_FAILED_MESSAGE,
    mutationOptions,
    transportFailureOptions,
} from '@/lib/mutation';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));

type Callbacks = ReturnType<typeof mutationOptions>;
const call = <K extends keyof Callbacks>(
    options: Callbacks,
    key: K,
    ...args: unknown[]
): unknown => (options[key] as (...a: unknown[]) => unknown)(...args);

describe('mutationOptions', () => {
    it('reports pending from start to finish', () => {
        const onPendingChange = vi.fn();
        const options = mutationOptions({
            component: 'Test',
            action: 'toggle',
            onPendingChange,
        });

        call(options, 'onStart', {});
        call(options, 'onFinish', {});

        expect(onPendingChange.mock.calls).toEqual([[true], [false]]);
    });

    it('toasts, reports and suppresses the modal on a transport failure', () => {
        const options = mutationOptions({ component: 'Test', action: 'pay' });

        expect(call(options, 'onNetworkError', new Error('offline'))).toBe(
            false,
        );
        expect(toast.error).toHaveBeenCalledWith(MUTATION_FAILED_MESSAGE);
        expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    });

    it('toasts, reports and suppresses the modal on an error status', () => {
        const options = mutationOptions({ component: 'Test', action: 'pay' });

        expect(call(options, 'onHttpException', { status: 500 })).toBe(false);
        expect(toast.error).toHaveBeenCalledWith(MUTATION_FAILED_MESSAGE);
        expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    });

    it("shows the server's validation message without reporting it", () => {
        const options = mutationOptions({ component: 'Test', action: 'pay' });

        call(options, 'onError', { status: 'Already paid.' });

        expect(toast.error).toHaveBeenCalledWith('Already paid.');
        expect(Sentry.captureException).not.toHaveBeenCalled();
    });
});

describe('formSubmitOptions', () => {
    const options = (onSuccess?: () => void) =>
        formSubmitOptions({
            component: 'Test',
            action: 'thing.create',
            isShownField: (key) => key === 'title',
            message: "Couldn't send that.",
            onSuccess,
        });

    it('leaves an error the form shows beside its field out of the toasts', () => {
        call(options(), 'onError', { title: 'Give it a name.' });

        expect(toast.error).not.toHaveBeenCalled();
    });

    it('toasts an error the form has no field for', () => {
        call(options(), 'onError', {
            title: 'Give it a name.',
            recipient: 'Meera has left.',
        });

        expect(toast.error).toHaveBeenCalledTimes(1);
        expect(toast.error).toHaveBeenCalledWith('Meera has left.');
    });

    it('falls back to its message for an unshown error with no text', () => {
        call(options(), 'onError', { other: '' });

        expect(toast.error).toHaveBeenCalledWith("Couldn't send that.");
    });

    it('reports a rejection by its keys only', () => {
        call(options(), 'onError', { title: 'Something private' });

        expect(Sentry.captureException).toHaveBeenCalledWith(
            expect.any(Error),
            expect.objectContaining({
                tags: {
                    component: 'Test',
                    action: 'thing.create',
                    surface: 'frontend',
                },
                extra: { validation_keys: ['title'] },
            }),
        );
    });

    it('toasts, reports and suppresses the modal on a transport failure', () => {
        const callbacks = options();

        expect(call(callbacks, 'onNetworkError', new Error('offline'))).toBe(
            false,
        );
        expect(call(callbacks, 'onHttpException', { status: 500 })).toBe(false);
        expect(toast.error).toHaveBeenCalledTimes(2);
        expect(toast.error).toHaveBeenCalledWith("Couldn't send that.");
        expect(Sentry.captureException).toHaveBeenCalledTimes(2);
    });

    it('passes success through', () => {
        const onSuccess = vi.fn();

        options(onSuccess).onSuccess?.({} as never);

        expect(onSuccess).toHaveBeenCalledTimes(1);
    });
});

describe('transportFailureOptions', () => {
    it('undoes, toasts its message and reports on a failure', () => {
        const onFailed = vi.fn();
        const options = transportFailureOptions({
            component: 'Test',
            action: 'delete',
            message: "Couldn't remove that.",
            onFailed,
        });

        expect(options.onHttpException?.({ status: 503 } as never)).toBe(false);
        expect(onFailed).toHaveBeenCalledTimes(1);
        expect(toast.error).toHaveBeenCalledWith("Couldn't remove that.");
        expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    });
});
