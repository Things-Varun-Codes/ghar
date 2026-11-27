import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useSuggestedCategory } from '@/MiniApps/Mailbox/lib/expenseCategories';
import type { ExpenseCategory } from '@/MiniApps/Mailbox/lib/expenseCategories';

// Three of ExpenseCategory's cases, as the page gets them.
const CATEGORIES: ExpenseCategory[] = [
    {
        key: 'groceries',
        label: 'Groceries',
        icon: 'shopping-basket',
        emoji: '🥕',
        words: ['Groceries'],
    },
    {
        key: 'taxis',
        label: 'Taxis',
        icon: 'car-taxi-front',
        emoji: '🚕',
        words: ['Taxis'],
    },
    {
        key: 'gifts',
        label: 'Gifts',
        icon: 'gift',
        emoji: '🎁',
        words: ['Gifts'],
    },
];
const NONE: never[] = [];

describe('useSuggestedCategory', () => {
    it('suggests a category from the title once the data loads', async () => {
        const { result } = renderHook(() =>
            useSuggestedCategory('Taxi', CATEGORIES, NONE, true),
        );

        await waitFor(() => expect(result.current).toBe('taxis'));
    });

    it('repeats what the group chose for the same title before', async () => {
        const history = [{ title: 'Kamath Stores', categoryId: 'gifts' }];
        const { result } = renderHook(() =>
            useSuggestedCategory('kamath stores', CATEGORIES, history, true),
        );

        await waitFor(() => expect(result.current).toBe('gifts'));
    });

    it('stays quiet when unsure, on an empty title, or once turned off', async () => {
        const ready = renderHook(() =>
            useSuggestedCategory('Groceries', CATEGORIES, NONE, true),
        );
        const unsure = renderHook(() =>
            useSuggestedCategory('Misc', CATEGORIES, NONE, true),
        );
        const empty = renderHook(() =>
            useSuggestedCategory('  ', CATEGORIES, NONE, true),
        );
        const off = renderHook(() =>
            useSuggestedCategory('Groceries', CATEGORIES, NONE, false),
        );

        await waitFor(() => expect(ready.result.current).toBe('groceries'));
        expect(unsure.result.current).toBeNull();
        expect(empty.result.current).toBeNull();
        expect(off.result.current).toBeNull();
    });
});
