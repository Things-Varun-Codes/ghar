/*
 * observability.ts — frontend silent-error retrofit helper.
 *
 * Single helper through which every silent
 * catch / Inertia onError site in resources/js routes its error reporting.
 *
 * Contract:
 *   - captureSilent(error, ctx) calls Sentry.captureException with the
 *     canonical tag shape `{ component, action, surface, user_role }`.
 *   - extra.payload is recursively scrubbed to keep tokens,
 *     passwords, push auth secrets out of the error tracker.
 *   - Always emits a neutral sonner toast so the user knows the failure
 *     surfaced — UX layer added under existing state machines, NOT a
 *     replacement.
 *   - No-ops gracefully when Sentry isn't initialized —
 *     local dev / smoke harness boots without SENTRY_BROWSER_DSN and must
 *     not crash.
 *
 * The inner try/catch around the Sentry call itself is deliberately silent —
 * recursing through captureSilent on a Sentry-thrown exception would be a
 * stack overflow. The eslint-disable below documents this.
 */

import * as Sentry from '@sentry/react';
import { toast } from 'sonner';

export interface CaptureCtx {
    component: string;
    action: string;
    surface: 'frontend' | 'backend' | 'queue';
    user_role?: 'admin' | 'user' | 'guest';
    extra?: {
        payload?: unknown;
        http_status?: number;
        inertia_visit_id?: string;
        [key: string]: unknown;
    };
}

const REDACT_KEYS = /^(password|token|jwt|auth|p256dh|secret|api[_-]?key)$/i;
const REDACTED = '[REDACTED]';
const CIRCULAR = '[CIRCULAR]';
const NEUTRAL_TOAST_MESSAGE = 'Something went wrong. Please try again.';

export function sanitizePayload(
    value: unknown,
    seen: WeakSet<object> = new WeakSet<object>(),
): unknown {
    if (value === null || value === undefined) {
        return value;
    }

    if (typeof value !== 'object') {
        return value;
    }

    if (seen.has(value as object)) {
        return CIRCULAR;
    }

    seen.add(value as object);

    if (Array.isArray(value)) {
        return value.map((item) => sanitizePayload(item, seen));
    }

    const out: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        if (REDACT_KEYS.test(key)) {
            out[key] = REDACTED;
        } else {
            out[key] = sanitizePayload(val, seen);
        }
    }

    return out;
}

export function captureSilent(error: unknown, ctx: CaptureCtx): void {
    const sentryAvailable =
        typeof Sentry !== 'undefined' &&
        typeof Sentry.captureException === 'function';

    if (sentryAvailable) {
        try {
            const sanitizedExtra = ctx.extra
                ? { ...ctx.extra, payload: sanitizePayload(ctx.extra.payload) }
                : undefined;

            Sentry.captureException(error, {
                tags: {
                    component: ctx.component,
                    action: ctx.action,
                    surface: ctx.surface,
                    user_role: ctx.user_role ?? 'guest',
                },
                extra: sanitizedExtra,
            });
            // eslint-disable-next-line local/no-silent-error -- reporting a Sentry SDK throw through captureSilent would recurse forever.
        } catch {
            // Intentionally empty — see directive above.
        }
    }

    toast.error(NEUTRAL_TOAST_MESSAGE);
}
