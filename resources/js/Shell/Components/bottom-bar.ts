import type { MiniApp } from '@/types/miniapp';

/** Home plus four rooms: past five items a bottom bar stops being glanceable. */
export const MAX_BAR_ROOMS = 4;

export function roomsForBar(miniApps: MiniApp[]): MiniApp[] {
    return miniApps.slice(0, MAX_BAR_ROOMS);
}

/**
 * The room the page belongs to: by component prefix, as AppLayout's `data-active-app`, or by
 * URL for a shell page rendered inside a room (a 404 under /apps/{slug}).
 */
export function activeMiniApp(
    apps: MiniApp[],
    component: string | undefined,
    path: string,
): MiniApp | undefined {
    return (
        apps.find(
            (app) =>
                app.component_prefix &&
                component?.startsWith(app.component_prefix),
        ) ??
        apps.find(
            (app) => path === app.route || path.startsWith(`${app.route}/`),
        )
    );
}
