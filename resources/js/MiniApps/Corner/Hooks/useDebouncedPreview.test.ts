import * as Sentry from '@sentry/react';
import { act, renderHook } from '@testing-library/react';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedPreview } from './useDebouncedPreview';

vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

type Json = { ok: boolean; title?: string };

type Pending = {
    url: string;
    signal: AbortSignal;
    respond: (json: Json) => Promise<void>;
    fail: (error: Error) => Promise<void>;
};

let requests: Pending[];
const onResult = vi.fn();

function setup() {
    return renderHook(() =>
        useDebouncedPreview<Json, { title: string }>({
            endpoint: '/preview',
            parse: (json) => ({ title: json.title ?? '' }),
            onResult,
            noMatchMessage: 'no match',
            failureMessage: 'failed',
            report: { component: 'c', action: 'a', tag: 't' },
        }),
    );
}

async function advance(ms = 400) {
    await act(async () => {
        await vi.advanceTimersByTimeAsync(ms);
    });
}

beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    requests = [];

    // Deliberately ignores the abort signal: a response already on the wire
    // can still resolve, and the hook must drop it.
    vi.stubGlobal(
        'fetch',
        vi.fn(
            (url: string, init: RequestInit) =>
                new Promise((resolve, reject) => {
                    requests.push({
                        url,
                        signal: init.signal as AbortSignal,
                        respond: (json) =>
                            act(async () => {
                                resolve({ ok: true, json: async () => json });
                            }),
                        fail: (error) =>
                            act(async () => {
                                reject(error);
                            }),
                    });
                }),
        ),
    );
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe('useDebouncedPreview', () => {
    it('does not let a slow earlier response overwrite a later one', async () => {
        const { result } = setup();

        act(() => result.current.trigger('https://a'));
        await advance();
        act(() => result.current.trigger('https://b'));
        await advance();

        expect(requests).toHaveLength(2);
        expect(requests[0].signal.aborted).toBe(true);
        expect(requests[1].signal.aborted).toBe(false);

        await requests[1].respond({ ok: true, title: 'Later' });
        await requests[0].respond({ ok: true, title: 'Earlier' });

        expect(result.current.preview).toEqual({ kind: 'ok', title: 'Later' });
        expect(onResult).toHaveBeenCalledTimes(1);
        expect(onResult).toHaveBeenCalledWith({ ok: true, title: 'Later' });
    });

    it('debounces rapid input into one request', async () => {
        const { result } = setup();

        act(() => result.current.trigger('https://a'));
        await advance(200);
        act(() => result.current.trigger('https://ab'));
        await advance();

        expect(requests).toHaveLength(1);
        expect(requests[0].url).toBe('/preview?url=https%3A%2F%2Fab');
    });

    it('does not refetch the same value on blur', async () => {
        const { result } = setup();

        act(() => result.current.trigger('https://a'));
        await advance();
        await requests[0].respond({ ok: true, title: 'A' });
        act(() => result.current.trigger(' https://a '));
        await advance();

        expect(requests).toHaveLength(1);
    });

    it('clears the timer on unmount', async () => {
        const { result, unmount } = setup();

        act(() => result.current.trigger('https://a'));
        unmount();
        await advance();

        expect(requests).toHaveLength(0);
    });

    it('cancel drops an in-flight response and returns to idle', async () => {
        const { result } = setup();

        act(() => result.current.trigger('https://a'));
        await advance();
        act(() => result.current.cancel());
        await requests[0].respond({ ok: true, title: 'A' });

        expect(result.current.preview).toEqual({ kind: 'idle' });
        expect(onResult).not.toHaveBeenCalled();
    });

    it('shows a failure once: inline and reported, never a toast', async () => {
        const { result } = setup();

        act(() => result.current.trigger('https://a'));
        await advance();
        await requests[0].fail(new Error('boom'));

        expect(result.current.preview).toEqual({
            kind: 'error',
            message: 'failed',
        });
        expect(Sentry.captureException).toHaveBeenCalledTimes(1);
        expect(toast.error).not.toHaveBeenCalled();
    });

    it('does not report an aborted request', async () => {
        const { result } = setup();

        act(() => result.current.trigger('https://a'));
        await advance();
        act(() => result.current.trigger('https://b'));
        await requests[0].fail(new DOMException('Aborted', 'AbortError'));

        expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it('shows the no-match message without reporting', async () => {
        const { result } = setup();

        act(() => result.current.trigger('https://a'));
        await advance();
        await requests[0].respond({ ok: false });

        expect(result.current.preview).toEqual({
            kind: 'error',
            message: 'no match',
        });
        expect(Sentry.captureException).not.toHaveBeenCalled();
    });
});
