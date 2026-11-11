import * as Sentry from '@sentry/react';
import { useCallback, useEffect, useRef, useState } from 'react';

export type PreviewState<T> =
    | { kind: 'idle' }
    | { kind: 'loading' }
    | ({ kind: 'ok' } & T)
    | { kind: 'error'; message: string };

type Options<TJson extends { ok: boolean }, T> = {
    endpoint: string;
    parse: (json: TJson, url: string) => T;
    onResult?: (json: TJson) => void;
    noMatchMessage: string;
    failureMessage: string;
    report: { component: string; action: string; tag: string };
};

const DEBOUNCE_MS = 400;

/*
 * Debounced paste-a-link preview. Each new input aborts the previous request
 * and an aborted request never touches state, so a slow earlier response can't
 * overwrite a later one. A failure shows inline only, so it reports directly
 * rather than through captureSilent's toast.
 */
export function useDebouncedPreview<TJson extends { ok: boolean }, T>(
    options: Options<TJson, T>,
) {
    const [preview, setPreview] = useState<PreviewState<T>>({ kind: 'idle' });
    const timer = useRef<number | null>(null);
    const controller = useRef<AbortController | null>(null);
    const requestedUrl = useRef<string | null>(null);
    const latestOptions = useRef(options);

    useEffect(() => {
        latestOptions.current = options;
    });

    const stop = useCallback(() => {
        if (timer.current !== null) {
            window.clearTimeout(timer.current);
            timer.current = null;
        }

        controller.current?.abort();
        controller.current = null;
        requestedUrl.current = null;
    }, []);

    useEffect(() => stop, [stop]);

    const run = useCallback(async (url: string) => {
        const { endpoint, parse, onResult, noMatchMessage, failureMessage } =
            latestOptions.current;
        const ctrl = new AbortController();

        controller.current = ctrl;
        setPreview({ kind: 'loading' });

        try {
            const response = await fetch(
                `${endpoint}?url=${encodeURIComponent(url)}`,
                {
                    signal: ctrl.signal,
                    headers: { Accept: 'application/json' },
                    credentials: 'same-origin',
                },
            );

            if (!response.ok) {
                throw new Error(`Preview HTTP ${response.status}`);
            }

            const json = (await response.json()) as TJson;

            if (ctrl.signal.aborted) {
                return;
            }

            if (!json.ok) {
                requestedUrl.current = null;
                setPreview({ kind: 'error', message: noMatchMessage });

                return;
            }

            setPreview({ kind: 'ok', ...parse(json, url) });
            onResult?.(json);
        } catch (error) {
            if (ctrl.signal.aborted) {
                return;
            }

            const { component, action, tag } = latestOptions.current.report;

            Sentry.captureException(error, {
                tags: { component, action, surface: 'frontend' },
                extra: { tag },
            });

            requestedUrl.current = null;
            setPreview({ kind: 'error', message: failureMessage });
        }
    }, []);

    const trigger = useCallback(
        (url: string) => {
            const trimmed = url.trim();

            if (trimmed === requestedUrl.current) {
                return;
            }

            stop();

            if (trimmed.length === 0) {
                setPreview({ kind: 'idle' });

                return;
            }

            requestedUrl.current = trimmed;
            timer.current = window.setTimeout(() => {
                timer.current = null;
                void run(trimmed);
            }, DEBOUNCE_MS);
        },
        [run, stop],
    );

    const cancel = useCallback(() => {
        stop();
        setPreview((current) =>
            current.kind === 'loading' ? { kind: 'idle' } : current,
        );
    }, [stop]);

    const clear = useCallback(() => {
        stop();
        setPreview({ kind: 'idle' });
    }, [stop]);

    return { preview, trigger, cancel, clear };
}
