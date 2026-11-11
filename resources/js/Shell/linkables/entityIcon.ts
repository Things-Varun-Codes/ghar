import { Compass, Film, Link2, MapPin, Music } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ENTITY_ICON: Record<string, LucideIcon> = {
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
