import type { LinkedThings } from '@/MiniApps/History/Components/BodyHtml';
import type { MediaItem } from '@/MiniApps/History/Components/MediaGrid';

export type EventChange = {
    id: number;
    action: string;
    summary: string;
    user_name: string;
    created_at: string;
};

export type EventPermissions = {
    update: boolean;
    delete: boolean;
};

/* A moment as EventResource sends it, on every page. */
export type HistoryEvent = {
    id: number;
    /* 'Y-m-d' */
    date: string;
    /* "4 Jun 2024" */
    date_label: string;
    year: number;
    title: string | null;
    location_freetext: string | null;
    location_place_id: string | null;
    location_name: string | null;
    location_address: string | null;
    location_lat: number | null;
    location_lng: number | null;
    body_html: string | null;
    links: LinkedThings;
    created_at: string;
    updated_at: string;
    media: MediaItem[];
    changes: EventChange[];
    can: EventPermissions;
};
