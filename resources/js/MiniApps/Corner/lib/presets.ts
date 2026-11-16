import type { DoneIcon } from '@/MiniApps/Corner/lib/types';

export type ListSettings = {
    name: string;
    icon: string;
    done_label: string;
    todo_label: string;
    done_icon: DoneIcon;
    notify_on_add: boolean;
};

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
        icon: 'music',
        done_label: 'Loved',
        todo_label: 'Playlist',
        done_icon: 'heart',
        notify_on_add: true,
    },
    {
        name: 'Movies',
        icon: 'film',
        done_label: 'Watched',
        todo_label: 'To watch',
        done_icon: 'check',
        notify_on_add: true,
    },
    {
        name: 'Places',
        icon: 'map-pin',
        done_label: 'Visited',
        todo_label: 'Wishlist',
        done_icon: 'check',
        notify_on_add: true,
    },
    {
        name: 'Things to do',
        icon: 'compass',
        done_label: 'Done',
        todo_label: 'To do',
        done_icon: 'check',
        notify_on_add: true,
    },
    {
        name: 'Books',
        icon: 'book-open',
        done_label: 'Read',
        todo_label: 'To read',
        done_icon: 'heart',
        notify_on_add: true,
    },
    {
        name: 'Restaurants',
        icon: 'utensils',
        done_label: 'Tried',
        todo_label: 'To try',
        done_icon: 'check',
        notify_on_add: true,
    },
    {
        name: 'Recipes',
        icon: 'chef-hat',
        done_label: 'Cooked',
        todo_label: 'To cook',
        done_icon: 'heart',
        notify_on_add: true,
    },
    {
        name: 'Board games',
        icon: 'dices',
        done_label: 'Played',
        todo_label: 'To play',
        done_icon: 'check',
        notify_on_add: true,
    },
];

export const BLANK_LIST: ListSettings = {
    name: '',
    icon: 'bookmark',
    done_label: 'Done',
    todo_label: 'To do',
    done_icon: 'check',
    notify_on_add: true,
};
