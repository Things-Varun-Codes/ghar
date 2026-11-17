import type { ItemPermissions } from '@/MiniApps/Corner/Hooks/useItemActions';

export type DoneIcon = 'check' | 'heart';

export type CornerListInfo = {
    id: number;
    slug: string;
    name: string;
    /* A lucide icon name. */
    icon: string;
    done_label: string;
    todo_label: string;
    done_icon: DoneIcon;
    notify_on_add: boolean;
    can: { update: boolean; delete: boolean };
    /* The viewer made this list, but someone else has added to it since. */
    delete_needs_admin: boolean;
};

/* Every item has the same parts; the ones it doesn't use are null. */
export type CornerItem = {
    id: number;
    title: string;
    notes: string | null;
    url: string | null;
    site_name: string | null;
    author: string | null;
    /* Where the picture comes from, for the edit form. */
    image_url: string | null;
    /* What a page draws: served by Corner, or null. */
    picture_url: string | null;
    location_label: string | null;
    location_url: string | null;
    place_id: string | null;
    lat: number | null;
    lng: number | null;
    address: string | null;
    added_at: string;
    done_at: string | null;
    is_done: boolean;
    can: ItemPermissions;
    added_by_user_id: number;
    addedBy: { id: number; name: string };
};
