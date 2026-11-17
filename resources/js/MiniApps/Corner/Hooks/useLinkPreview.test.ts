import * as Sentry from '@sentry/react';
import { act, renderHook } from '@testing-library/react';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLinkPreview } from './useLinkPreview';

vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

type Json = { ok: boolean; title?: string; image_url?: string };

type Pending = {
    url: string;
    signal: AbortSignal;
    respond: (json: Json) => Promise<void>;
    fail: (error: Error) => Promise<void>;
};

let requests: Pending[];
const onFound = vi.fn();

function setup() {
    return renderHook(() => useLinkPreview(onFound));
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

describe('useLinkPreview', () => {
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

        expect(result.current.preview).toEqual({
            kind: 'ok',
            title: 'Later',
            image_url: null,
        });
        expect(onFound).toHaveBeenCalledTimes(1);
        expect(onFound).toHaveBeenCalledWith({
            title: 'Later',
            image_url: null,
        });
    });

    it('debounces rapid input into one request', async () => {
        const { result } = setup();

        act(() => result.current.trigger('https://a'));
        await advance(200);
        act(() => result.current.trigger('https://ab'));
        await advance();

        expect(requests).toHaveLength(1);
        expect(requests[0].url).toBe(
            '/api/corner/link-preview?url=https%3A%2F%2Fab',
        );
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
        expect(onFound).not.toHaveBeenCalled();
    });

    it('shows a failure once: inline and reported, never a toast', async () => {
        const { result } = setup();

        act(() => result.current.trigger('https://a'));
        await advance();
        await requests[0].fail(new Error('boom'));

        expect(result.current.preview).toEqual({
            kind: 'error',
            message:
                "Couldn't reach that page. It will be saved with what you type.",
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
            message:
                "That page didn't say what it is. Give it a name yourself.",
        });
        expect(Sentry.captureException).not.toHaveBeenCalled();
    });
});
