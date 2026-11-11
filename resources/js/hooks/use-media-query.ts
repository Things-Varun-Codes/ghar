import { useSyncExternalStore } from 'react';

export function useMediaQuery(query: string): boolean {
    const mql =
        typeof window === 'undefined' ? undefined : window.matchMedia(query);

    function subscribe(callback: () => void): () => void {
        if (!mql) {
            return () => {};
        }

        mql.addEventListener('change', callback);

        return () => mql.removeEventListener('change', callback);
    }

    function getSnapshot(): boolean {
        return mql?.matches ?? false;
    }

    function getServerSnapshot(): boolean {
        return false;
    }

    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
