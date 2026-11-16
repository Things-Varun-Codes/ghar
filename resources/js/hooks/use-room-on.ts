import { usePage } from '@inertiajs/react';

import type { MiniApp } from '@/types/miniapp';

export function useRoomOn(slug: string): boolean {
    const { miniApps } = usePage<{ miniApps?: MiniApp[] }>().props;

    return (miniApps ?? []).some((app) => app.slug === slug);
}
