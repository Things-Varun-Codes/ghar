import { router } from '@inertiajs/react';
import { previousUrl } from '@/lib/navigation';
import { pathOf } from '@/lib/url';

/**
 * Back to `parent`. If the parent is the page we came from, step back through history so its
 * scroll and loaded rows come back; otherwise replace this entry, so the OS back button doesn't
 * bounce between the two.
 */
export function goBack(parent: string): void {
    const previous = previousUrl();

    if (previous !== null && pathOf(previous) === pathOf(parent)) {
        window.history.back();

        return;
    }

    router.visit(parent, { replace: true });
}
