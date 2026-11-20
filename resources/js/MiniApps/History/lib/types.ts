import type { LinkedThings } from '@/MiniApps/History/Components/BodyHtml';
import type { MediaItem } from '@/MiniApps/History/Components/MediaGrid';
import type { Person } from '@/types/person';

export type EventChange = {
    id: number;
    action: string;
    summary: string;
    user_name: string;
    created_at: string;
};

/* The keys of EventReaction::EMOJI, in the order the server sends them. */
export type ReactionKey = 'heart' | 'laugh' | 'wow' | 'sad' | 'pray' | 'party';

/* One emoji of the fixed set: always all six, `count` 0 when nobody has used it. */
export type EventReactionSummary = {
    key: ReactionKey;
    emoji: string;
    count: number;
    /* The viewer has this one on. */
    mine: boolean;
    /* Who, in the order they reacted. */
    people: Person[];
};

/* Plain text: render as text with `white-space: pre-line`, never as HTML. Oldest first. */
export type EventComment = {
    id: number;
    body: string;
    /* null once the author's account is gone: show "Someone". */
    author: Person | null;
    /* ISO 8601 */
    created_at: string;
    can: { delete: boolean };
};

/* A member with a birthday, for the form's "Is this Meera's birthday?" (MemberBirthdays.php). */
export type MemberBirthday = {
    person: Person;
    month: number;
    day: number;
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
    /* null once the creator's account is gone. */
    creator: Person | null;
    /* The member whose birthday this moment is. */
    birthday_of: Person | null;
    reactions: EventReactionSummary[];
    comments: EventComment[];
    can: EventPermissions;
};
