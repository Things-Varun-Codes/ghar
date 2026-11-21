import { router } from '@inertiajs/react';

import { useConversionPolling } from '@/MiniApps/History/Hooks/useConversionPolling';

type Row = { id: number };

/* `rows` with each one `fresh` holds swapped in; the same array when none matched. */
export function patchRows<T extends Row>(rows: T[], fresh: T[]): T[] {
    const byId = new Map(fresh.map((row) => [row.id, row]));
    let changed = false;
    const patched = rows.map((row) => {
        const next = byId.get(row.id);

        if (next === undefined) {
            return row;
        }

        changed = true;

        return next;
    });

    return changed ? patched : rows;
}

/*
 * While any row shown has a photo still converting, asks the server for those rows every few
 * seconds (the page's `converting` prop) and swaps them into the scroll prop in place. Reloading
 * the scroll prop itself would start the list over at its first page.
 */
export function useConvertingRows<T extends Row>(
    prop: string,
    rows: T[],
    isConverting: (row: T) => boolean,
): void {
    const ids = rows.filter(isConverting).map((row) => row.id);

    useConversionPolling(ids.length > 0, () => {
        router.reload({
            only: ['converting'],
            data: { converting: ids.join(',') },
            preserveUrl: true,
            // Async, so a tick never cancels a load-more or a sort visit in flight.
            async: true,
            onSuccess: (page) => {
                const fresh = page.props.converting as T[] | undefined;

                if (fresh && fresh.length > 0) {
                    // Patches whatever the list holds by then, so a page loaded meanwhile stays.
                    router.replaceProp(`${prop}.data`, (current: unknown) =>
                        patchRows(current as T[], fresh),
                    );
                }
            },
        });
    });
}
