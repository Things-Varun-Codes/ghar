import type { ReactNode } from 'react';
import {
    createContext,
    useContext,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import type { BackTarget } from '@/Shell/Components/BackChevron';

export type ShellPageInfo = { title: string; back?: BackTarget };

type ShellChrome = {
    publish: (info: ShellPageInfo) => () => void;
};

const ShellChromeContext = createContext<ShellChrome | null>(null);
const ShellPageInfoContext = createContext<ShellPageInfo | null>(null);

/*
 * Lets the page under the persistent AppLayout tell the phone top bar its title and back
 * target. The newest publisher wins; its cleanup only clears what it published itself, so an
 * outgoing page unmounting after the next one mounted can't blank the bar.
 */
export function ShellChromeProvider({ children }: { children: ReactNode }) {
    const [info, setInfo] = useState<ShellPageInfo | null>(null);
    const owner = useRef<symbol | null>(null);

    const chrome = useMemo<ShellChrome>(
        () => ({
            publish(next) {
                const token = Symbol('shell-page');
                owner.current = token;
                setInfo(next);

                return () => {
                    if (owner.current === token) {
                        owner.current = null;
                        setInfo(null);
                    }
                };
            },
        }),
        [],
    );

    return (
        <ShellChromeContext.Provider value={chrome}>
            <ShellPageInfoContext.Provider value={info}>
                {children}
            </ShellPageInfoContext.Provider>
        </ShellChromeContext.Provider>
    );
}

/** True inside AppLayout: the phone top bar is there to carry the title and back. */
export function useInShellChrome(): boolean {
    return useContext(ShellChromeContext) !== null;
}

export function useShellPageInfo(): ShellPageInfo | null {
    return useContext(ShellPageInfoContext);
}

export function usePublishShellPage(title: string, back?: BackTarget): void {
    const chrome = useContext(ShellChromeContext);
    const backHref = back?.href;
    const backLabel = back?.label;

    useLayoutEffect(() => {
        if (!chrome) {
            return;
        }

        return chrome.publish({
            title,
            back:
                backHref !== undefined && backLabel !== undefined
                    ? { href: backHref, label: backLabel }
                    : undefined,
        });
    }, [chrome, title, backHref, backLabel]);
}
