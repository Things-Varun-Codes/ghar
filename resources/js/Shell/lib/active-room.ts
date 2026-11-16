import type { MiniApp } from '@/types/miniapp';

/** The room whose pages render this component: AppLayout's `data-active-app`. */
export function miniAppForComponent(
    apps: MiniApp[],
    component: string | undefined,
): MiniApp | undefined {
    return apps.find(
        (app) =>
            app.component_prefix && component?.startsWith(app.component_prefix),
    );
}

/**
 * The room the page belongs to: by component prefix, or by URL for a shell page rendered
 * inside a room (a 404 under /apps/{slug}).
 */
export function activeMiniApp(
    apps: MiniApp[],
    component: string | undefined,
    path: string,
): MiniApp | undefined {
    return (
        miniAppForComponent(apps, component) ??
        apps.find(
            (app) => path === app.route || path.startsWith(`${app.route}/`),
        )
    );
}
