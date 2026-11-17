import type { CornerItem } from '@/MiniApps/Corner/lib/types';

/* Who made it and where it lives, once each: "Rick Astley · YouTube". */
export function bylineOf(
    item: Pick<CornerItem, 'author' | 'site_name'>,
): string {
    return [item.author, item.site_name]
        .filter((part, i, all) => part && all.indexOf(part) === i)
        .join(' · ');
}
