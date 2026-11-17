import type { IconIndex } from '@/Shell/linkables/lucide';

/* The icon picker's logic, kept apart from its drawing so it can be tested. */

export type Section = { key: string; title: string; icons: string[] };

export type Row =
    | { kind: 'heading'; section: Section; top: number }
    | {
          kind: 'icons';
          section: Section;
          icons: string[];
          /* Position of the row's first icon among every icon shown, in order. */
          first: number;
          top: number;
      };

export const CELL = 44;
export const GAP = 4;
export const ROW_HEIGHT = CELL + GAP;
export const HEADING_HEIGHT = 32;

/* Shown first, before anything has been chosen: the household kinds of thing a list holds. */
export const SUGGESTED = [
    'bookmark',
    'music',
    'film',
    'book-open',
    'utensils',
    'chef-hat',
    'map-pin',
    'plane',
    'tent',
    'dices',
    'gamepad-2',
    'gift',
    'heart',
    'star',
    'shopping-bag',
    'sprout',
];

export function columnsFor(width: number): number {
    return Math.max(4, Math.floor((width + GAP) / ROW_HEIGHT));
}

/*
 * Every icon whose name or tags contain each word typed, best first: the exact name, then a
 * name that starts with it, a name containing it, then tags ("food" finds pizza), then the
 * category it is in ("food" also finds coffee, which is under food and beverage).
 */
export function searchIcons(
    index: IconIndex,
    names: string[],
    query: string,
): string[] {
    const words = query
        .toLowerCase()
        .trim()
        .split(/[\s-]+/)
        .filter(Boolean);

    if (words.length === 0) {
        return [];
    }

    const inCategories = categoryWords(index);
    const scored: { name: string; score: number }[] = [];

    for (const name of names) {
        const tags = index.tags[name] ?? [];
        let score = 0;

        for (const word of words) {
            const best =
                name === word
                    ? 100
                    : name.startsWith(word)
                      ? 80
                      : name.split('-').includes(word)
                        ? 70
                        : name.includes(word)
                          ? 50
                          : tags.some((tag) => tag === word)
                            ? 40
                            : tags.some((tag) => tag.startsWith(word))
                              ? 25
                              : tags.some((tag) => tag.includes(word))
                                ? 10
                                : (inCategories[name] ?? '').includes(word)
                                  ? 5
                                  : 0;

            if (best === 0) {
                score = 0;
                break;
            }

            score += best;
        }

        if (score > 0) {
            scored.push({ name, score });
        }
    }

    return scored
        .sort(
            (a, b) =>
                b.score - a.score ||
                a.name.length - b.name.length ||
                a.name.localeCompare(b.name),
        )
        .map((entry) => entry.name);
}

const categoryCache = new WeakMap<IconIndex, Record<string, string>>();

/* What each icon's categories are called, worked out once per index, not per keystroke. */
function categoryWords(index: IconIndex): Record<string, string> {
    let words = categoryCache.get(index);

    if (!words) {
        words = {};

        for (const category of index.categories) {
            for (const icon of category.icons) {
                words[icon] =
                    `${words[icon] ?? ''} ${category.title.toLowerCase()}`;
            }
        }

        categoryCache.set(index, words);
    }

    return words;
}

/* Each section as a heading row and its icons in rows of `columns`, with where each row sits. */
export function layoutRows(
    sections: Section[],
    columns: number,
): { rows: Row[]; height: number } {
    const rows: Row[] = [];
    let top = 0;
    let first = 0;

    for (const section of sections) {
        if (section.icons.length === 0) {
            continue;
        }

        rows.push({ kind: 'heading', section, top });
        top += HEADING_HEIGHT;

        for (let i = 0; i < section.icons.length; i += columns) {
            const icons = section.icons.slice(i, i + columns);
            rows.push({ kind: 'icons', section, icons, first, top });
            first += icons.length;
            top += ROW_HEIGHT;
        }
    }

    return { rows, height: top };
}

/*
 * Where an arrow key moves the active icon. Left and right step through the order; up and down
 * keep the column, landing on the nearest icon of a shorter row, across section headings.
 */
export function moveActive(rows: Row[], active: number, key: string): number {
    const iconRows = rows.filter(
        (row): row is Extract<Row, { kind: 'icons' }> => row.kind === 'icons',
    );
    const total = iconRows.reduce((sum, row) => sum + row.icons.length, 0);

    if (total === 0) {
        return -1;
    }

    if (active < 0) {
        return 0;
    }

    if (key === 'ArrowRight') {
        return Math.min(total - 1, active + 1);
    }

    if (key === 'ArrowLeft') {
        return Math.max(0, active - 1);
    }

    const at = iconRows.findIndex(
        (row) => active >= row.first && active < row.first + row.icons.length,
    );
    const column = active - iconRows[at].first;
    const target = iconRows[at + (key === 'ArrowDown' ? 1 : -1)];

    if (!target) {
        return active;
    }

    return target.first + Math.min(column, target.icons.length - 1);
}

/* The rows that meet the visible band, with some to spare either side. */
export function visibleRows(
    rows: Row[],
    scrollTop: number,
    viewport: number,
    overscan = 2 * ROW_HEIGHT,
): Row[] {
    const from = scrollTop - overscan;
    const to = scrollTop + viewport + overscan;

    return rows.filter((row) => {
        const height = row.kind === 'heading' ? HEADING_HEIGHT : ROW_HEIGHT;

        return row.top + height >= from && row.top <= to;
    });
}

/* The section whose heading has scrolled past the top, for the sticky heading. */
export function sectionAt(rows: Row[], scrollTop: number): Section | null {
    let current: Section | null = null;

    for (const row of rows) {
        if (row.kind === 'heading' && row.top <= scrollTop + 1) {
            current = row.section;
        }
    }

    return current ?? rows[0]?.section ?? null;
}

const RECENT_KEY = 'ghar.corner.recent-icons';
const RECENT_MAX = 8;

export function recentIcons(): string[] {
    try {
        const stored = JSON.parse(
            window.localStorage.getItem(RECENT_KEY) ?? '[]',
        );

        return Array.isArray(stored)
            ? stored.filter((v) => typeof v === 'string').slice(0, RECENT_MAX)
            : [];
        // eslint-disable-next-line local/no-silent-error -- private browsing or bad JSON: no recent icons is the right answer.
    } catch {
        return [];
    }
}

export function rememberIcon(name: string): void {
    try {
        const next = [name, ...recentIcons().filter((n) => n !== name)].slice(
            0,
            RECENT_MAX,
        );
        window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
        // eslint-disable-next-line local/no-silent-error -- storage can be full or blocked; remembering is a nicety.
    } catch {
        // Nothing to do.
    }
}
