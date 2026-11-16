import { Bookmark } from 'lucide-react';
import type { LucideIcon, LucideProps } from 'lucide-react';
import { createElement, useEffect, useState } from 'react';

/*
 * A lucide icon by name, loaded the first time it is needed: a household can pick any of
 * lucide's icons for a list, and bundling them all would weigh every page down. The name map
 * is its own chunk too. Until an icon arrives a box of its size holds its place.
 */

type IconModule = { default: LucideIcon };
type IconImports = Record<string, () => Promise<IconModule>>;

const loaded = new Map<string, LucideIcon>();
let imports: Promise<IconImports> | null = null;

function iconImports(): Promise<IconImports> {
    imports ??= import('lucide-react/dynamicIconImports').then(
        (module) => module.default as unknown as IconImports,
    );

    return imports;
}

export function loadIcon(name: string): Promise<LucideIcon> {
    const ready = loaded.get(name);

    if (ready) {
        return Promise.resolve(ready);
    }

    return iconImports()
        .then((all) => (all[name] ? all[name]() : null))
        .then((module) => {
            const icon = module?.default ?? Bookmark;
            loaded.set(name, icon);

            return icon;
        })
        .catch(() => Bookmark);
}

type Props = Omit<LucideProps, 'ref'> & { name: string | null | undefined };

export default function LinkableIcon({ name, size = 24, ...props }: Props) {
    const key = name || 'bookmark';
    const [icon, setIcon] = useState<{ key: string; Icon: LucideIcon } | null>(
        () => {
            const ready = loaded.get(key);

            return ready ? { key, Icon: ready } : null;
        },
    );

    useEffect(() => {
        let live = true;

        loadIcon(key).then((Icon) => {
            if (live) {
                setIcon({ key, Icon });
            }
        });

        return () => {
            live = false;
        };
    }, [key]);

    if (icon === null || icon.key !== key) {
        return (
            <span
                aria-hidden="true"
                style={{ display: 'inline-block', width: size, height: size }}
            />
        );
    }

    return createElement(icon.Icon, { 'aria-hidden': true, size, ...props });
}
