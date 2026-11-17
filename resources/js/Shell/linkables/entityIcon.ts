import { Bookmark, Compass, Film, Link2, MapPin, Music } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ENTITY_ICON: Record<string, LucideIcon> = {
    // A household names its own lists, so a link to one of their things gets one mark.
    'corner.item': Bookmark,
    // Links written before lists were customisable keep the mark they had.
    'corner.song': Music,
    'corner.movie': Film,
    'corner.activity': Compass,
    'corner.place': MapPin,
};

export function entityIcon(type: string | null | undefined): LucideIcon {
    if (!type) {
        return Link2;
    }

    return ENTITY_ICON[type] ?? Link2;
}
