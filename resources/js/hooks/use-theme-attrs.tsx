/*
 * Radix portals mount at body, outside [data-theme] and [data-app]. Spread useThemeAttrs() on each
 * portaled root, before {...props}.
 */

import { usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';

export type ThemeAttrs = {
    theme?: string;
    app?: string;
};

const ThemeAttrsContext = createContext<ThemeAttrs>({});

export function ThemeAttrsProvider({
    value,
    children,
}: {
    value: ThemeAttrs;
    children: ReactNode;
}) {
    const parent = useContext(ThemeAttrsContext);
    const merged: ThemeAttrs = {
        theme: value.theme ?? parent.theme,
        app: value.app ?? parent.app,
    };

    return (
        <ThemeAttrsContext.Provider value={merged}>
            {children}
        </ThemeAttrsContext.Provider>
    );
}

export function useThemeAttrs(): { 'data-theme': string; 'data-app'?: string } {
    const ctx = useContext(ThemeAttrsContext);

    let activeThemeFromInertia: string | undefined;

    try {
        const page = usePage() as
            { props?: { activeTheme?: string } } | undefined;
        activeThemeFromInertia = page?.props?.activeTheme;
        // eslint-disable-next-line local/no-silent-error -- usePage() throws outside a mounted Inertia page (tests); fall back to the default theme.
    } catch {
        activeThemeFromInertia = undefined;
    }

    const theme = ctx.theme ?? activeThemeFromInertia ?? 'pastel';
    const app = ctx.app; // no fallback — data-app is mini-app-scoped, absence is intentional

    return {
        'data-theme': theme,
        ...(app ? { 'data-app': app } : {}),
    };
}
