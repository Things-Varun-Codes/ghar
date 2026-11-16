import type { MiniApp } from '@/types/miniapp';

/** Home plus four rooms: past five items a bottom bar stops being glanceable. */
export const MAX_BAR_ROOMS = 4;

export function roomsForBar(miniApps: MiniApp[]): MiniApp[] {
    return miniApps.slice(0, MAX_BAR_ROOMS);
}

/** The icon a room ships as `MiniApps/{App}/nav-icon.tsx`, found through its `component_prefix`. */
export function navIconFor<T>(
    app: MiniApp,
    modules: Record<string, T>,
): T | undefined {
    const dir = app.component_prefix?.replace(/\/$/, '');

    if (!dir) {
        return undefined;
    }

    const key = Object.keys(modules).find((k) =>
        k.endsWith(`/${dir}/nav-icon.tsx`),
    );

    return key === undefined ? undefined : modules[key];
}
