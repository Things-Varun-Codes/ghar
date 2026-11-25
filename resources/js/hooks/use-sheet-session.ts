import { useState } from 'react';

type Session<T> = { value: T | null; open: boolean; key: number };

/*
 * A sheet that stays mounted after it closes, so it can animate out, but starts fresh each time
 * it opens: render it while `value` is set, with `key` as its key. Each `show` is a new key, so
 * the form inside is new (an item saved and edited again shows what was saved); closing keeps
 * the value, so the sheet's content stays put while it slides away.
 */
export function useSheetSession<T>() {
    const [session, setSession] = useState<Session<T>>({
        value: null,
        open: false,
        key: 0,
    });

    return {
        value: session.value,
        open: session.open,
        key: session.key,
        show: (value: T) =>
            setSession((current) => ({
                value,
                open: true,
                key: current.key + 1,
            })),
        onOpenChange: (next: boolean) => {
            if (!next) {
                setSession((current) => ({ ...current, open: false }));
            }
        },
    };
}
