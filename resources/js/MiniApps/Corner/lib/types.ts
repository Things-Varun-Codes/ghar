import type { ItemPermissions } from '@/MiniApps/Corner/Hooks/useItemActions';

/** What an item in a list is: decides how it looks and what it can hold. */
export type ListKind = 'link' | 'poster' | 'place' | 'plain';

export type DoneIcon = 'check' | 'heart';

export type CornerListInfo = {
    id: number;
    slug: string;
    name: string;
    kind: ListKind;
    icon: string;
    done_label: string;
    todo_label: string;
    done_icon: DoneIcon;
    notify_on_add: boolean;
    can: { update: boolean; delete: boolean };
    /* The viewer made this list, but someone else has added to it since. */
    delete_needs_admin: boolean;
};

/* Every kind sends every field; the ones a kind doesn't use are null. */
export type CornerItem = {
    id: number;
    title: string;
    notes: string | null;
    url: string | null;
    image_url: string | null;
    author: string | null;
    provider: string | null;
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
