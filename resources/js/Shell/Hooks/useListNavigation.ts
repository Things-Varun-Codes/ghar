import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

// Delay gate for the Mode-B `navigating` flag. Matches Inertia's own
// progress-bar default delay so the two affordances never disagree — a fast
// local round-trip shows neither, a slow one shows both.
const NAVIGATING_DELAY_MS = 250;

export interface ListNavigation {
    /* Patches the query string (filter, sort, search) and visits it; '' or undefined drops a key. */
    navigate: (patch: Record<string, string | undefined>) => void;
    /* True once a navigate visit has been pending for NAVIGATING_DELAY_MS. */
    navigating: boolean;
}

/** Filter, sort and search a list by visiting its own URL with a new query. */
export function useListNavigation(): ListNavigation {
    const visitIdRef = useRef(0);
    const navigatingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );
    const [navigating, setNavigating] = useState(false);

    useEffect(() => {
        return () => {
            if (navigatingTimerRef.current !== null) {
                clearTimeout(navigatingTimerRef.current);
            }
        };
    }, []);

    function navigate(patch: Record<string, string | undefined>) {
        const params = new URLSearchParams(window.location.search);

        for (const [key, value] of Object.entries(patch)) {
            if (value === undefined || value === '') {
                params.delete(key);
            } else {
                params.set(key, value);
            }
        }

        const query = params.toString();
        const url = query
            ? `${window.location.pathname}?${query}`
            : window.location.pathname;

        const visitId = ++visitIdRef.current;

        if (navigatingTimerRef.current !== null) {
            clearTimeout(navigatingTimerRef.current);
        }

        navigatingTimerRef.current = setTimeout(() => {
            if (visitId === visitIdRef.current) {
                setNavigating(true);
            }
        }, NAVIGATING_DELAY_MS);

        router.get(
            url,
            {},
            {
                preserveScroll: false,
                preserveState: true,
                onFinish: () => {
                    // A newer navigate() may own visitIdRef by now; don't clear its pending state.
                    if (visitId !== visitIdRef.current) {
                        return;
                    }

                    if (navigatingTimerRef.current !== null) {
                        clearTimeout(navigatingTimerRef.current);
                        navigatingTimerRef.current = null;
                    }

                    setNavigating(false);
                },
            },
        );
    }

    return { navigate, navigating };
}
