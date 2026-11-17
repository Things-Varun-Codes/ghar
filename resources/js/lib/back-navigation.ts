import { router } from '@inertiajs/react';
import { previousPath } from '@/lib/navigation';
import { pathOf } from '@/lib/url';
import { dashboard } from '@/routes';
import type { MiniApp } from '@/types/miniapp';

export type BackTarget = { href: string; label: string };

/**
 * Where back goes from a page that names no parent of its own: a page inside a room goes to the
 * room's landing, anything else to Home. Only the registry is consulted, so the shell names no
 * room; a page deeper than that, or one whose parent isn't its room, passes `back`.
 */
export function defaultParent(
    path: string,
    rooms: readonly Pick<MiniApp, 'name' | 'route'>[],
): BackTarget {
    const room = rooms.find((app) => path.startsWith(`${app.route}/`));

    return room
        ? { href: room.route, label: room.name }
        : { href: dashboard.url(), label: 'Home' };
}

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
