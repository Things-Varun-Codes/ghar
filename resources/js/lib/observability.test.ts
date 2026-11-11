import { describe, expect, it, vi } from 'vitest';

import { captureSilent, sanitizePayload } from './observability';

const { sentryCaptureException } = vi.hoisted(() => ({
    sentryCaptureException: vi.fn(),
}));

vi.mock('@sentry/react', () => ({
    captureException: sentryCaptureException,
}));

const { toastError } = vi.hoisted(() => ({
    toastError: vi.fn(),
}));

vi.mock('sonner', () => ({
    toast: { error: toastError },
}));

describe('sanitizePayload', () => {
    it('redacts every key the pattern matches, case-insensitively, both the underscore and hyphen api-key spellings, top-level, nested, and inside an array element', () => {
        const payload = {
            password: 'secret1',
            PASSWORD: 'secret2',
            api_key: 'secret3',
            'api-key': 'secret4',
            nested: { token: 'secret5', keep: 'ok' },
            list: [{ jwt: 'secret6' }, 'plain'],
        };

        const result = sanitizePayload(payload) as Record<string, unknown>;

        expect(result.password).toBe('[REDACTED]');
        expect(result.PASSWORD).toBe('[REDACTED]');
        expect(result.api_key).toBe('[REDACTED]');
        expect(result['api-key']).toBe('[REDACTED]');
        expect((result.nested as Record<string, unknown>).token).toBe(
            '[REDACTED]',
        );
        expect((result.nested as Record<string, unknown>).keep).toBe('ok');
        expect(
            ((result.list as unknown[])[0] as Record<string, unknown>).jwt,
        ).toBe('[REDACTED]');
        expect((result.list as unknown[])[1]).toBe('plain');
    });

    it('leaves non-matching keys, primitives, null and undefined untouched', () => {
        expect(sanitizePayload('a string')).toBe('a string');
        expect(sanitizePayload(42)).toBe(42);
        expect(sanitizePayload(true)).toBe(true);
        expect(sanitizePayload(null)).toBeNull();
        expect(sanitizePayload(undefined)).toBeUndefined();

        const result = sanitizePayload({
            username: 'not-secret',
        }) as Record<string, unknown>;
        expect(result.username).toBe('not-secret');
    });

    it('resolves a self-referential object to the circular marker instead of hanging or throwing', () => {
        const circular: Record<string, unknown> = { name: 'x' };
        circular.self = circular;

        const result = sanitizePayload(circular) as Record<string, unknown>;

        expect(result.name).toBe('x');
        expect(result.self).toBe('[CIRCULAR]');
    });

    it("note: a repeated-but-acyclic reference also resolves to the circular marker (the shared `seen` WeakSet marks every visited object) — actual behaviour, left alone, out of this batch's scope to change", () => {
        const shared = { value: 1 };
        const payload = { first: shared, second: shared };

        const result = sanitizePayload(payload) as Record<string, unknown>;

        expect(result.first).toEqual({ value: 1 });
        expect(result.second).toBe('[CIRCULAR]');
    });
});

describe('captureSilent', () => {
    it('forwards the canonical four-tag shape, defaulting user_role to guest', () => {
        captureSilent(new Error('boom'), {
            component: 'Settings/Notifications',
            action: 'push.subscribe',
            surface: 'frontend',
        });

        expect(sentryCaptureException).toHaveBeenCalledWith(
            expect.any(Error),
            expect.objectContaining({
                tags: {
                    component: 'Settings/Notifications',
                    action: 'push.subscribe',
                    surface: 'frontend',
                    user_role: 'guest',
                },
            }),
        );
    });

    it('honors an explicit user_role when supplied', () => {
        captureSilent(new Error('boom'), {
            component: 'Settings/Notifications',
            action: 'push.subscribe',
            surface: 'frontend',
            user_role: 'admin',
        });

        expect(sentryCaptureException).toHaveBeenCalledWith(
            expect.any(Error),
            expect.objectContaining({
                tags: expect.objectContaining({ user_role: 'admin' }),
            }),
        );
    });

    it('scrubs extra.payload while sibling extra keys survive unchanged', () => {
        captureSilent(new Error('boom'), {
            component: 'C',
            action: 'a.b',
            surface: 'frontend',
            extra: {
                payload: { password: 'secret' },
                http_status: 500,
            },
        });

        const callArgs = sentryCaptureException.mock.calls[0][1] as {
            extra: { payload: unknown; http_status: number };
        };

        expect(callArgs.extra.payload).toEqual({ password: '[REDACTED]' });
        expect(callArgs.extra.http_status).toBe(500);
    });

    it('leaves extra undefined when the caller supplies none', () => {
        captureSilent(new Error('boom'), {
            component: 'C',
            action: 'a.b',
            surface: 'frontend',
        });

        const callArgs = sentryCaptureException.mock.calls[0][1] as {
            extra: unknown;
        };

        expect(callArgs.extra).toBeUndefined();
    });

    it('fires the neutral toast on the success path', () => {
        captureSilent(new Error('boom'), {
            component: 'C',
            action: 'a.b',
            surface: 'frontend',
        });

        expect(toastError).toHaveBeenCalledTimes(1);
        expect(toastError).toHaveBeenCalledWith(
            'Something went wrong. Please try again.',
        );
    });

    it('the allow-listed bare catch: a Sentry throw does not propagate, and the toast still fires exactly once', () => {
        sentryCaptureException.mockImplementationOnce(() => {
            throw new Error('sentry is down');
        });

        expect(() =>
            captureSilent(new Error('boom'), {
                component: 'C',
                action: 'a.b',
                surface: 'frontend',
            }),
        ).not.toThrow();

        expect(toastError).toHaveBeenCalledTimes(1);
    });
});
