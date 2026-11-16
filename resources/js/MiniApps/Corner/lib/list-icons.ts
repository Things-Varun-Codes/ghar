import {
    Bookmark,
    BookOpen,
    Camera,
    ChefHat,
    Coffee,
    Compass,
    Dices,
    Dumbbell,
    Film,
    Gamepad2,
    Gift,
    MapPin,
    Music,
    Palette,
    PawPrint,
    Plane,
    Puzzle,
    ShoppingBag,
    Star,
    Tent,
    Trees,
    Tv,
    Utensils,
    Wine,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { createElement } from 'react';

/* Keep in step with ListIcon::KEYS, which the server validates against. */
export const LIST_ICONS: Record<string, { Icon: LucideIcon; label: string }> = {
    music: { Icon: Music, label: 'Music' },
    film: { Icon: Film, label: 'Film' },
    tv: { Icon: Tv, label: 'TV' },
    book: { Icon: BookOpen, label: 'Book' },
    'map-pin': { Icon: MapPin, label: 'Pin' },
    compass: { Icon: Compass, label: 'Compass' },
    plane: { Icon: Plane, label: 'Plane' },
    tent: { Icon: Tent, label: 'Tent' },
    utensils: { Icon: Utensils, label: 'Knife and fork' },
    'chef-hat': { Icon: ChefHat, label: 'Chef’s hat' },
    coffee: { Icon: Coffee, label: 'Coffee' },
    wine: { Icon: Wine, label: 'Wine' },
    dice: { Icon: Dices, label: 'Dice' },
    gamepad: { Icon: Gamepad2, label: 'Game controller' },
    puzzle: { Icon: Puzzle, label: 'Puzzle' },
    palette: { Icon: Palette, label: 'Paints' },
    camera: { Icon: Camera, label: 'Camera' },
    gift: { Icon: Gift, label: 'Gift' },
    'shopping-bag': { Icon: ShoppingBag, label: 'Shopping bag' },
    dumbbell: { Icon: Dumbbell, label: 'Dumbbell' },
    trees: { Icon: Trees, label: 'Trees' },
    paw: { Icon: PawPrint, label: 'Paw' },
    star: { Icon: Star, label: 'Star' },
    bookmark: { Icon: Bookmark, label: 'Bookmark' },
};

export const DEFAULT_LIST_ICON = 'bookmark';

export function listIcon(key: string | null | undefined): LucideIcon {
    return LIST_ICONS[key ?? '']?.Icon ?? Bookmark;
}

type ListIconProps = {
    name: string | null | undefined;
    size?: number;
    strokeWidth?: number;
    className?: string;
};

/* A list's icon by its key. Looked up, not declared, so it goes through createElement. */
export function ListIcon({ name, ...props }: ListIconProps) {
    return createElement(listIcon(name), { 'aria-hidden': true, ...props });
}
