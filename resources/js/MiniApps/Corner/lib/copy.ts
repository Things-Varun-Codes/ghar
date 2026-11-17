import type { CornerItem } from '@/MiniApps/Corner/lib/types';

/* "1 thing", "3 things": a list is named by the household, so its things are just things. */
export function thingsCount(count: number): string {
    return `${count} ${count === 1 ? 'thing' : 'things'}`;
}

/* Who made it and where it lives, once each: "Rick Astley · YouTube". */
export function bylineOf(
    item: Pick<CornerItem, 'author' | 'site_name'>,
): string {
    return [item.author, item.site_name]
        .filter((part, i, all) => part && all.indexOf(part) === i)
        .join(' · ');
}
