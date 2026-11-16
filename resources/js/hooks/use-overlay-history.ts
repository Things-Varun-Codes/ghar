import { router } from '@inertiajs/react';
import { useLayoutEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { hasParam, withParam, withoutParam } from '@/lib/url';

/*
 * An open sheet or dialog owns one history entry, so the browser or OS back gesture closes it
 * instead of leaving the page. Closing it any other way steps back over that entry, so back
 * never "re-closes" it or skips a page.
 *
 * Inertia keeps its page in history.state and, on popstate, remounts the page from it. That
 * would throw away a draft, so a popstate that leaves our entry is stopped before Inertia sees
 * it and then handed to the topmost overlay, whose own dirty gate decides. Chromium runs
 * window's popstate listeners in the order they were added, capture or not, so ours must be
 * added before Inertia's: app.tsx calls installOverlayHistory() before createInertiaApp(). Afterwards a client-side `router.replace`
 * writes the current page into the entry we landed on, so Inertia's copy stays current.
 *
 * Nested overlays share the one entry: only the first pushes, back goes to the topmost, and
 * the entry comes back while anything is still open.
 */

export type OverlayParam = readonly [name: string, value: string];

type PendingVisit = { method: string; replace: boolean };

export type OverlayHistoryEnv = {
    length: () => number;
    /* path + query + hash */
    href: () => string;
    back: () => void;
    /* A copy of the current entry at the current URL, for an overlay that has no URL of its own. */
    pushSame: () => void;
    /* An Inertia client-side visit: no request, same props, scroll and state kept. */
    visit: (url: string, replace: boolean, onDone?: () => void) => void;
    defer: (fn: () => void) => void;
    listen: (handlers: {
        pop: (event: Event) => void;
        before: (visit: PendingVisit) => void;
        success: (url: string) => void;
    }) => void;
};

type Registration = {
    id: number;
    onBack: () => void;
    param: OverlayParam | null;
};

type Entry = {
    /*
     * history.length right after our push (null until Inertia's queued push lands). A later push
     * changes it, so the entry is no longer on top.
     */
    length: number | null;
    /* The URL Inertia holds for the page while the entry is on top. */
    url: string;
    paramName: string | null;
};

export function createOverlayHistory(env: OverlayHistoryEnv) {
    let nextId = 1;
    let listening = false;
    let stack: Registration[] = [];
    let entry: Entry | null = null;
    // A close we started with history.back(): the popstate it causes is ours to swallow.
    let pendingPop: { url: string } | null = null;

    const onTop = (): boolean =>
        entry !== null &&
        (entry.length === null || env.length() === entry.length);

    function pushEntry(param: OverlayParam | null): void {
        const href = env.href();

        if (param === null) {
            env.pushSame();
            entry = { length: env.length(), url: href, paramName: null };

            return;
        }

        const [name, value] = param;

        // Opened from its own URL (a shared link, a refresh): put the plain page under it first,
        // so back lands there rather than on a copy of the open overlay.
        if (hasParam(href, name)) {
            env.visit(withoutParam(href, name), true);
        }

        const target = withParam(href, name, value);
        const pushed: Entry = { length: null, url: target, paramName: name };
        entry = pushed;
        env.visit(target, false, () => {
            pushed.length = env.length();
        });
    }

    function stepBack(): void {
        if (entry === null) {
            return;
        }

        pendingPop = { url: withoutParam(env.href(), entry.paramName) };
        entry = null;
        env.back();
    }

    function handlePop(event: Event): void {
        if (pendingPop !== null) {
            const { url } = pendingPop;
            pendingPop = null;
            event.stopImmediatePropagation();
            env.visit(url, true);

            if (stack.length > 0 && entry === null) {
                pushEntry(stack[0].param);
            }

            return;
        }

        if (entry === null || stack.length === 0) {
            return; // not ours: Inertia handles it
        }

        event.stopImmediatePropagation();
        const url = withoutParam(entry.url, entry.paramName);
        entry = null;

        stack[stack.length - 1].onBack();

        if (stack.length === 0) {
            env.visit(url, true);
        } else {
            // Still open (the gate kept it, or only a nested overlay closed): restore the entry.
            pushEntry(stack[0].param);
        }
    }

    function ensureListening(): void {
        if (listening) {
            return;
        }

        listening = true;
        env.listen({
            pop: handlePop,
            // A save made from inside an overlay replaces its entry instead of stacking a page on
            // it, so stepping back over the entry afterwards lands on the page before it.
            before: (visit) => {
                if (onTop() && visit.method !== 'get') {
                    visit.replace = true;
                }
            },
            success: (url) => {
                if (entry !== null && onTop()) {
                    entry.url = url;
                }
            },
        });
    }

    return {
        open(onBack: () => void, param: OverlayParam | null = null): number {
            ensureListening();
            const id = nextId++;
            stack.push({ id, onBack, param });

            if (stack.length === 1 && entry === null && pendingPop === null) {
                pushEntry(param);
            }

            return id;
        },

        close(id: number): void {
            stack = stack.filter((r) => r.id !== id);

            if (stack.length > 0) {
                return;
            }

            // Deferred, so an overlay that hands over to another in the same commit keeps the entry.
            env.defer(() => {
                if (stack.length > 0 || entry === null) {
                    return;
                }

                if (onTop()) {
                    stepBack();
                } else {
                    // A visit pushed a page on top: the entry is history now, leave it be.
                    entry = null;
                }
            });
        },

        handlePop,
    };
}

export type OverlayHistory = ReturnType<typeof createOverlayHistory>;

let popHandler: ((event: Event) => void) | null = null;
let popListenerAdded = false;

export function installOverlayHistory(): void {
    if (popListenerAdded) {
        return;
    }

    popListenerAdded = true;
    window.addEventListener('popstate', (event) => popHandler?.(event), {
        capture: true,
    });
}

const browserEnv: OverlayHistoryEnv = {
    length: () => window.history.length,
    href: () =>
        window.location.pathname +
        window.location.search +
        window.location.hash,
    back: () => window.history.back(),
    pushSame: () =>
        window.history.pushState(
            window.history.state,
            '',
            window.location.href,
        ),
    visit: (url, replace, onDone) => {
        const options = {
            url,
            preserveScroll: true,
            preserveState: true,
            // onFinish, not onSuccess: a page holding validation errors never calls onSuccess.
            onFinish: () => onDone?.(),
        };

        if (replace) {
            router.replace(options);
        } else {
            router.push(options);
        }
    },
    defer: (fn) => queueMicrotask(fn),
    listen: ({ pop, before, success }) => {
        popHandler = pop;
        installOverlayHistory();
        router.on('before', (event) => before(event.detail.visit));
        router.on('success', (event) => success(event.detail.page.url));
    },
};

let shared: OverlayHistory | null = null;

function overlayHistory(): OverlayHistory {
    shared ??= createOverlayHistory(browserEnv);

    return shared;
}

/**
 * While `open`, the overlay owns a history entry; back calls `onBack`, which should run the
 * same close path as the close button (dirty gate included). `param` puts the overlay in the
 * URL (`?moment=12`), so it can be copied and a refresh reopens it.
 */
export function useOverlayHistory(
    open: boolean,
    onBack: () => void,
    options: { param?: OverlayParam | null } = {},
): void {
    const onBackRef = useRef(onBack);
    const paramRef = useRef(options.param ?? null);

    // Before the effect below, so an overlay opened in the same render as its param sees it.
    useLayoutEffect(() => {
        onBackRef.current = onBack;
        paramRef.current = options.param ?? null;
    });

    // Layout effect: back handling decides synchronously whether the overlay closed.
    useLayoutEffect(() => {
        if (!open) {
            return;
        }

        const history = overlayHistory();
        const id = history.open(
            () => flushSync(() => onBackRef.current()),
            paramRef.current,
        );

        return () => history.close(id);
    }, [open]);
}
