import { router } from '@inertiajs/react';
import { toast } from 'sonner';

const TOAST_ID = 'connection';

type StartedVisit = {
    url: URL;
    method: string;
    only: string[];
};

/**
 * Tells people when a page can't be reached. Only whole-page GET visits get the toast: a
 * load-more has its own inline retry and a write reports its own failure.
 */
export function watchConnection(): void {
    let lastVisit: StartedVisit | null = null;

    router.on('start', (event) => {
        const { url, method, only } = event.detail.visit;
        lastVisit = { url, method, only };
    });

    router.on('networkError', () => {
        const visit = lastVisit;

        if (!visit || visit.method !== 'get' || visit.only.length > 0) {
            return;
        }

        toast.error(
            navigator.onLine ? "Couldn't reach Ghar." : "You're offline.",
            {
                id: TOAST_ID,
                description: 'Check your connection and try again.',
                action: {
                    label: 'Retry',
                    onClick: () => router.visit(visit.url.href),
                },
            },
        );
    });

    window.addEventListener('offline', () => {
        toast("You're offline.", {
            id: TOAST_ID,
            description: 'Pages will load again once you reconnect.',
            duration: Infinity,
        });
    });

    window.addEventListener('online', () => {
        toast.dismiss(TOAST_ID);
    });
}
