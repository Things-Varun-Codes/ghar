import { router } from '@inertiajs/react';
import { previousPath } from '@/lib/navigation';
import { pathOf } from '@/lib/url';

/**
 * Back to `parent`. If the parent is the page we came from, step back through history so its
 * scroll and loaded rows come back; otherwise replace this entry, so the OS back button doesn't
 * bounce between the two.
 */
export function goBack(parent: string): void {
    if (previousPath() === pathOf(parent)) {
        window.history.back();

        return;
    }

    router.visit(parent, { replace: true });
}
