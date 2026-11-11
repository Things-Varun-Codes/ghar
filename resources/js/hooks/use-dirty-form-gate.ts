import type { InertiaFormProps } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';

type Options<T> = { fields?: (keyof T)[] };

export function useDirtyFormGate<T extends object>(
    form: InertiaFormProps<T>,
    options?: Options<T>,
): {
    isDirty: boolean;
    gate: (next: boolean) => boolean;
    reset: (overrides?: Partial<T>) => void;
} {
    const fieldsKey = options?.fields ? options.fields.join(',') : '';

    const pick = useCallback(
        (data: T): Partial<T> => {
            if (!options?.fields || options.fields.length === 0) {
                return data;
            }

            const result: Partial<T> = {};

            for (const key of options.fields) {
                result[key] = data[key];
            }

            return result;
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps -- fieldsKey is the stable identity for options.fields, a fresh array each render
        [fieldsKey],
    );

    const snapshotRef = useRef<string>(JSON.stringify(pick(form.data)));

    const currentJson = JSON.stringify(pick(form.data));
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        setIsDirty(currentJson !== snapshotRef.current);
    }, [currentJson]);

    const gate = useCallback(
        (next: boolean): boolean => {
            if (next) {
                return true; // opening is never blocked
            }

            return !isDirty; // closing blocked only when dirty
        },
        [isDirty],
    );

    const reset = useCallback(
        (overrides?: Partial<T>) => {
            const merged = overrides
                ? { ...form.data, ...overrides }
                : form.data;

            snapshotRef.current = JSON.stringify(pick(merged));
            setIsDirty(false);
        },
        [form.data, pick],
    );

    return { isDirty, gate, reset };
}
