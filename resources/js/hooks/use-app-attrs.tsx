/*
 * Base UI portals mount at body, outside [data-app], so a mini app's scoped styles miss them. Spread
 * useAppAttrs() on each portaled root, before {...props}.
 */

import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';

const AppAttrsContext = createContext<string | undefined>(undefined);

export function AppAttrsProvider({
    app,
    children,
}: {
    app: string;
    children: ReactNode;
}) {
    return (
        <AppAttrsContext.Provider value={app}>
            {children}
        </AppAttrsContext.Provider>
    );
}

export function useAppAttrs(): { 'data-app'?: string } {
    const app = useContext(AppAttrsContext);

    return app ? { 'data-app': app } : {};
}
