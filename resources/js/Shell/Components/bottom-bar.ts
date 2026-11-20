import type { LucideIcon } from 'lucide-react';
import type { MiniApp } from '@/types/miniapp';

/*
 * Each room supplies its nav icon as the default export of MiniApps/{App}/nav-icon.tsx. A build-time
 * glob keeps the shell free of named imports, so a new room needs no shell edit. Eager: each module
 * is a single lucide icon, so the first paint has no flash and no extra request.
 */
export const navIcons = import.meta.glob<LucideIcon>(
    '../../MiniApps/*/nav-icon.tsx',
    { eager: true, import: 'default' },
);

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
