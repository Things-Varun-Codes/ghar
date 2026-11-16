import type { DoneIcon, ListKind } from '@/MiniApps/Corner/lib/types';

export type ListSettings = {
    name: string;
    kind: ListKind;
    icon: string;
    done_label: string;
    todo_label: string;
    done_icon: DoneIcon;
    notify_on_add: boolean;
};

export const KINDS: {
    kind: ListKind;
    label: string;
    /* What a suggestion card says about the kind. */
    short: string;
    description: string;
}[] = [
    {
        kind: 'plain',
        label: 'Plain',
        short: 'A simple list',
        description: 'A name and notes. Things to do, books, gifts.',
    },
    {
        kind: 'link',
        label: 'Link',
        short: 'Links, with artwork',
        description:
            'Paste a link; YouTube and Spotify bring their artwork. Shown in a CD frame.',
    },
    {
        kind: 'poster',
        label: 'Poster',
        short: 'With posters',
        description:
            'A title, with a poster when you add a Plex link. Films and shows.',
    },
    {
        kind: 'place',
        label: 'Place',
        short: 'On the map',
        description: 'Somewhere on the map, with its address.',
    },
];

/* Ready answers for "what is a finished one called". Any word can be typed instead. */
export const DONE_WORDS = [
    'Done',
    'Loved',
    'Watched',
    'Visited',
    'Read',
    'Cooked',
    'Played',
    'Tried',
];

/* The word for the ones not done yet, when a done word is picked from the chips. */
export const TODO_FOR_DONE: Record<string, string> = {
    Done: 'To do',
    Loved: 'Playlist',
    Watched: 'To watch',
    Visited: 'Wishlist',
    Read: 'To read',
    Cooked: 'To cook',
    Played: 'To play',
    Tried: 'To try',
};

/* A fresh room offers these, one tap each. Only the name is checked against what exists. */
export const SUGGESTED_LISTS: ListSettings[] = [
    {
        name: 'Songs',
        kind: 'link',
        icon: 'music',
        done_label: 'Loved',
        todo_label: 'Playlist',
        done_icon: 'heart',
        notify_on_add: true,
    },
    {
        name: 'Movies',
        kind: 'poster',
        icon: 'film',
        done_label: 'Watched',
        todo_label: 'To watch',
        done_icon: 'check',
        notify_on_add: true,
    },
    {
        name: 'Places',
        kind: 'place',
        icon: 'map-pin',
        done_label: 'Visited',
        todo_label: 'Wishlist',
        done_icon: 'check',
        notify_on_add: true,
    },
    {
        name: 'Things to do',
        kind: 'plain',
        icon: 'compass',
        done_label: 'Done',
        todo_label: 'To do',
        done_icon: 'check',
        notify_on_add: true,
    },
    {
        name: 'Books',
        kind: 'plain',
        icon: 'book',
        done_label: 'Read',
        todo_label: 'To read',
        done_icon: 'heart',
        notify_on_add: true,
    },
    {
        name: 'Restaurants',
        kind: 'place',
        icon: 'utensils',
        done_label: 'Tried',
        todo_label: 'To try',
        done_icon: 'check',
        notify_on_add: true,
    },
    {
        name: 'Recipes',
        kind: 'link',
        icon: 'chef-hat',
        done_label: 'Cooked',
        todo_label: 'To cook',
        done_icon: 'heart',
        notify_on_add: true,
    },
    {
        name: 'Board games',
        kind: 'plain',
        icon: 'dice',
        done_label: 'Played',
        todo_label: 'To play',
        done_icon: 'check',
        notify_on_add: true,
    },
];

export const BLANK_LIST: ListSettings = {
    name: '',
    kind: 'plain',
    icon: 'bookmark',
    done_label: 'Done',
    todo_label: 'To do',
    done_icon: 'check',
    notify_on_add: true,
};
