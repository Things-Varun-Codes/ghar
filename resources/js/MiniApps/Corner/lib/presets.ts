import type { DoneIcon } from '@/MiniApps/Corner/lib/types';

export type ListSettings = {
    name: string;
    icon: string;
    done_label: string;
    todo_label: string;
    done_icon: DoneIcon;
    notify_on_add: boolean;
    /* Each person marks a thing done for themselves; off for a new list unless chosen. */
    done_per_person?: boolean;
};

/*
 * Ready answers for "what is a finished one called", each with the word for the ones not done
 * yet, filled in when the chip is picked. Any word can be typed instead.
 */
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

export const DONE_WORDS = Object.keys(TODO_FOR_DONE);

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
