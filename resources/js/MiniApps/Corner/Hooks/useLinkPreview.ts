import { useHttp } from '@inertiajs/react';
import * as Sentry from '@sentry/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebounceCallback } from 'usehooks-ts';
import { preview as linkPreview } from '@/routes/apps/our-shelf/link';

/* What a pasted page says about itself. */
export type LinkFound = {
    title: string | null;
    image_url: string | null;
};

type LinkJson = {
    ok: boolean;
    title?: string | null;
    image_url?: string | null;
};

export type LinkPreviewState =
    | { kind: 'idle' }
    | { kind: 'loading' }
    | ({ kind: 'ok' } & LinkFound)
    | { kind: 'error'; message: string };

const DEBOUNCE_MS = 400;

const NO_MATCH_MESSAGE =
    "That page didn't say what it is. Give it a name yourself.";
const FAILURE_MESSAGE =
    "Couldn't reach that page. It will be saved with what you type.";

/*
 * Reads a pasted link once typing stops. Each new address aborts the previous request and an
 * aborted request never touches state, so a slow earlier response can't overwrite a later one.
 * A failure shows inline only, so it reports directly rather than through captureSilent's toast.
 */
export function useLinkPreview(onFound?: (link: LinkFound) => void) {
    const [preview, setPreview] = useState<LinkPreviewState>({
        kind: 'idle',
    });
    const { get, cancel: cancelRequest } = useHttp<
        Record<string, never>,
        LinkJson | undefined
    >();
    // Bumped by every stop(), so a response that lands after it is dropped.
    const generation = useRef(0);
    const requestedUrl = useRef<string | null>(null);
    const latestOnFound = useRef(onFound);

    useEffect(() => {
        latestOnFound.current = onFound;
    });

    const run = useCallback(
        async (url: string) => {
            const current = generation.current;

            setPreview({ kind: 'loading' });

            try {
                const json = await get(
                    `${linkPreview.url()}?url=${encodeURIComponent(url)}`,
                );

                if (current !== generation.current) {
                    return;
                }

                // useHttp resolves a 422 with nothing rather than throwing.
                if (json === undefined) {
                    throw new Error('Preview HTTP 422');
                }

                if (!json.ok) {
                    requestedUrl.current = null;
                    setPreview({ kind: 'error', message: NO_MATCH_MESSAGE });

                    return;
                }

                const found: LinkFound = {
                    title: json.title ?? null,
                    image_url: json.image_url ?? null,
                };

                setPreview({ kind: 'ok', ...found });
                latestOnFound.current?.(found);
            } catch (error) {
                if (current !== generation.current) {
                    return;
                }

                Sentry.captureException(error, {
                    tags: {
                        component: 'Corner/ItemSheet',
                        action: 'link.preview',
                        surface: 'frontend',
                    },
                    extra: { tag: 'corner.link-preview' },
                });

                requestedUrl.current = null;
                setPreview({ kind: 'error', message: FAILURE_MESSAGE });
            }
        },
        [get],
    );

    const debouncedRun = useDebounceCallback(run, DEBOUNCE_MS);

    const stop = useCallback(() => {
        debouncedRun.cancel();
        generation.current++;
        cancelRequest();
        requestedUrl.current = null;
    }, [debouncedRun, cancelRequest]);

    useEffect(() => stop, [stop]);

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
            debouncedRun(trimmed);
        },
        [debouncedRun, stop],
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

    // Asks again for the same address, which trigger() alone would skip.
    const retry = useCallback(
        (url: string) => {
            stop();
            trigger(url);
        },
        [stop, trigger],
    );

    return { preview, trigger, cancel, clear, retry };
}
