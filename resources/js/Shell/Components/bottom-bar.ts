import type { MiniApp } from '@/types/miniapp';

/** Home plus four rooms: past five items a bottom bar stops being glanceable. */
export const MAX_BAR_ROOMS = 4;

export function roomsForBar(miniApps: MiniApp[]): MiniApp[] {
    return miniApps.slice(0, MAX_BAR_ROOMS);
}
