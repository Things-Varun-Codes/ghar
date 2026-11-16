import { Search } from 'lucide-react';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';

import { Input } from '@/components/ui/input';
import { ICON_GROUPS } from '@/MiniApps/Corner/lib/icon-groups';
import { ListIcon } from '@/MiniApps/Corner/lib/list-icons';

type Props = {
    value: string;
    onChange: (icon: string) => void;
};

/* As many as a search shows at once; a narrower search shows the rest. */
const MAX_RESULTS = 96;

function labelOf(name: string): string {
    const words = name.replace(/-/g, ' ');

    return words.charAt(0).toUpperCase() + words.slice(1);
}

/*
 * Every lucide icon, found by searching its name; a few grouped ones to browse first. Only the
 * icons on screen are loaded. The full list of names is loaded the first time someone searches.
 */
export default function IconPicker({ value, onChange }: Props) {
    const [query, setQuery] = useState('');
    const deferred = useDeferredValue(query.trim().toLowerCase());
    const [allNames, setAllNames] = useState<string[] | null>(null);

    useEffect(() => {
        if (deferred === '' || allNames !== null) {
            return;
        }

        let live = true;

        void import('lucide-react/dynamicIconImports').then((module) => {
            if (live) {
                setAllNames(Object.keys(module.default));
            }
        });

        return () => {
            live = false;
        };
    }, [deferred, allNames]);

    const results = useMemo(() => {
        if (deferred === '' || allNames === null) {
            return null;
        }

        const words = deferred.split(/\s+/);

        return allNames
            .filter((name) => words.every((w) => name.includes(w)))
            .sort((a, b) => a.length - b.length)
            .slice(0, MAX_RESULTS);
    }, [deferred, allNames]);

    const option = (name: string) => (
        <button
            key={name}
            type="button"
            role="radio"
            aria-checked={value === name}
            aria-label={labelOf(name)}
            title={labelOf(name)}
            onClick={() => onChange(name)}
            className="corner-icon-option shell-press"
        >
            <ListIcon name={name} size={20} strokeWidth={1.5} />
        </button>
    );

    return (
        <div className="corner-icon-picker">
            <div className="corner-icon-search">
                <Search aria-hidden="true" size={16} strokeWidth={1.5} />
                <Input
                    type="search"
                    aria-label="Search icons"
                    placeholder="Search icons: book, cake, plant…"
                    autoComplete="off"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="text-(length:--text-body)"
                />
            </div>

            {results !== null ? (
                results.length > 0 ? (
                    <div
                        role="radiogroup"
                        aria-label="Icons matching your search"
                        className="corner-icon-grid"
                    >
                        {results.map(option)}
                    </div>
                ) : (
                    <p className="corner-form-hint">
                        No icon is called that. Try a simpler word.
                    </p>
                )
            ) : (
                ICON_GROUPS.map((group) => (
                    <div key={group.label} className="corner-icon-group">
                        <p className="corner-icon-group-label">{group.label}</p>
                        <div
                            role="radiogroup"
                            aria-label={group.label}
                            className="corner-icon-grid"
                        >
                            {group.icons.map(option)}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
