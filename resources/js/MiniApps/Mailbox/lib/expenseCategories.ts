import * as Sentry from '@sentry/react';
import { useEffect, useState } from 'react';
import type { Chunk, Classifier, HistoryEntry } from 'whatcategory';
import { createClassifier, loadData } from 'whatcategory';

import { region } from '@/lib/dates';

/* One of ExpenseCategory's cases, as the group page sends them. */
export type ExpenseCategory = {
    key: string;
    label: string;
    /* A lucide icon name. */
    icon: string;
    /* What whatcategory matches a title against. */
    emoji: string;
    words: string[];
};

/* What an expense with no category shows. */
export const NO_CATEGORY_ICON = 'receipt-text';

let data: Promise<Chunk[]> | null = null;
let built: { key: string; classifier: Classifier } | null = null;

/* The household's language and country first, then English, which the category words are in. */
function household(): Promise<Chunk[]> {
    const locale = region().locale;
    const country = new Intl.Locale(locale).region;

    data ??= loadData({
        locales: [locale, 'en'],
        regions: country ? [country] : [],
    });

    return data;
}

/* Building one takes about 100 ms, so it is kept while the categories stay the same. */
async function classifierFor(
    categories: ExpenseCategory[],
): Promise<Classifier> {
    const key = categories.map((category) => category.key).join(' ');
    const chunks = await household();

    if (built?.key !== key) {
        built = {
            key,
            classifier: createClassifier({
                categories: categories.map(({ key: id, emoji, words }) => ({
                    id,
                    emoji,
                    words,
                })),
                data: chunks,
            }),
        };
    }

    return built.classifier;
}

/*
 * The category a title suggests: the group's own earlier choice for the same title first, then
 * the open data. Null when unsure, while the data loads, or if it failed to. Memoise `history`.
 */
export function useSuggestedCategory(
    title: string,
    categories: ExpenseCategory[],
    history: HistoryEntry[],
    enabled: boolean,
): string | null {
    const [classifier, setClassifier] = useState<Classifier | null>(null);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        let live = true;
        classifierFor(categories).then(
            (ready) => live && setClassifier(ready),
            (error: unknown) => {
                // A suggestion is a nicety: without one the expense has no category, so no toast.
                data = null;
                Sentry.captureException(error, {
                    tags: {
                        component: 'Mailbox/ExpenseSheet',
                        action: 'expense.suggest-category',
                        surface: 'frontend',
                    },
                });
            },
        );

        return () => {
            live = false;
        };
    }, [enabled, categories]);

    return title.trim() === ''
        ? null
        : (classifier?.suggest(title, history)?.id ?? null);
}
