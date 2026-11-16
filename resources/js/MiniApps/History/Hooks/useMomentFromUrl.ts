import { router } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import { withoutParam } from '@/hooks/use-overlay-history';
import {
    hasMomentParam,
    momentIdFromUrl,
    MOMENT_PARAM,
} from '@/MiniApps/History/lib/momentUrl';

/**
 * On mount, opens the moment named by `?moment={id}`: the server's `moment` prop (which reaches
 * past the loaded page), else a moment already on the page (a page restored from history). An id
 * that matches neither opens nothing and leaves the address bar.
 */
export function useMomentFromUrl<T extends { id: number }>(
    requested: T | null | undefined,
    loaded: T[],
    open: (event: T) => void,
): void {
    const first = useRef({ requested, loaded, open });

    useEffect(() => {
        const href =
            window.location.pathname +
            window.location.search +
            window.location.hash;

        if (!hasMomentParam(href)) {
            return;
        }

        const { requested, loaded, open } = first.current;
        const id = momentIdFromUrl(href);
        const event =
            id === null
                ? undefined
                : requested?.id === id
                  ? requested
                  : loaded.find((e) => e.id === id);

        if (event) {
            open(event);

            return;
        }

        router.replace({
            url: withoutParam(href, MOMENT_PARAM),
            preserveScroll: true,
            preserveState: true,
        });
    }, []);
}
