import type { IconNode } from 'lucide-react';

/*
 * Every lucide icon, drawn from data rather than one module per icon: a household can pick any
 * of them for a list, and two lazily loaded chunks (the drawings; the categories and search
 * tags the picker needs) replace about two thousand tiny files. Both are written by
 * scripts/lucide-icons.mjs from the installed lucide-react.
 */

export type IconPaths = {
    version: string;
    paths: Record<string, IconNode>;
    aliases: Record<string, string>;
};

export type IconIndex = {
    version: string;
    categories: { key: string; title: string; icons: string[] }[];
    tags: Record<string, string[]>;
};

let paths: Promise<IconPaths> | null = null;
let index: Promise<IconIndex> | null = null;
let ready: IconPaths | null = null;

export function loadIconPaths(): Promise<IconPaths> {
    paths ??= import('./lucide-paths.json')
        .then((module) => {
            ready = module.default as unknown as IconPaths;

            return ready;
        })
        .catch((error: unknown) => {
            // A failed chunk may load next time: forget it rather than fail for good.
            paths = null;

            throw error;
        });

    return paths;
}

export function loadIconIndex(): Promise<IconIndex> {
    index ??= import('./lucide-index.json')
        .then((module) => module.default as unknown as IconIndex)
        .catch((error: unknown) => {
            index = null;

            throw error;
        });

    return index;
}

/* The drawings, if they have already arrived: lets an icon draw on its first render. */
export function iconPathsIfLoaded(): IconPaths | null {
    return ready;
}

export function iconNode(data: IconPaths, name: string): IconNode | null {
    return data.paths[data.aliases[name] ?? name] ?? null;
}

/* "paw-print" reads "Paw print". */
export function iconLabel(name: string): string {
    const words = name.replace(/-/g, ' ');

    return words.charAt(0).toUpperCase() + words.slice(1);
}
