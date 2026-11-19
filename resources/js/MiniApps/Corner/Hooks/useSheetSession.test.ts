import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useSheetSession } from './useSheetSession';

describe('useSheetSession', () => {
    it('mounts nothing until the first open', () => {
        const { result } = renderHook(() => useSheetSession<string>());

        expect(result.current.value).toBeNull();
        expect(result.current.open).toBe(false);
    });

    it('keeps what it showed while it closes, so the sheet can slide away', () => {
        const { result } = renderHook(() => useSheetSession<string>());

        act(() => result.current.show('Yellow'));
        act(() => result.current.onOpenChange(false));

        expect(result.current.open).toBe(false);
        expect(result.current.value).toBe('Yellow');
    });

    it('starts a fresh sheet on every open, even of the same thing', () => {
        const { result } = renderHook(() => useSheetSession<string>());

        act(() => result.current.show('Yellow'));
        const first = result.current.key;
        act(() => result.current.onOpenChange(false));
        act(() => result.current.show('Yellow'));

        expect(result.current.open).toBe(true);
        expect(result.current.key).not.toBe(first);
    });

    it('ignores a request to open from the sheet itself', () => {
        const { result } = renderHook(() => useSheetSession<string>());

        act(() => result.current.show('Yellow'));
        const key = result.current.key;
        act(() => result.current.onOpenChange(true));

        expect(result.current.key).toBe(key);
        expect(result.current.open).toBe(true);
    });
});
