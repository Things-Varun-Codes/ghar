import { useSyncExternalStore } from 'react';

type Store = {
    subscribe: (callback: () => void) => () => void;
    getSnapshot: () => boolean;
};

// One MediaQueryList per query, so a re-render doesn't resubscribe.
const stores = new Map<string, Store>();

const serverStore: Store = {
    subscribe: () => () => {},
    getSnapshot: () => false,
};

function storeFor(query: string): Store {
    if (typeof window === 'undefined') {
        return serverStore;
    }

    let store = stores.get(query);

    if (!store) {
        const mql = window.matchMedia(query);
        store = {
            subscribe: (callback) => {
                mql.addEventListener('change', callback);

                return () => mql.removeEventListener('change', callback);
            },
            getSnapshot: () => mql.matches,
        };
        stores.set(query, store);
    }

    return store;
}

function getServerSnapshot(): boolean {
    return false;
}

export function useMediaQuery(query: string): boolean {
    const { subscribe, getSnapshot } = storeFor(query);

    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
