/*
 * use-menu-action.test.ts — the deferred action must run exactly once, and
 * only when the menu has closed (onCloseAutoFocus), never on select itself.
 */
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useMenuAction } from './use-menu-action';

describe('useMenuAction', () => {
    it('runs the selected action on close, not on select', () => {
        const { result } = renderHook(() => useMenuAction());
        const action = vi.fn();

        result.current.defer(action)();
        expect(action).not.toHaveBeenCalled();

        result.current.onCloseAutoFocus();
        expect(action).toHaveBeenCalledTimes(1);
    });

    it('runs the action once — a later close (Escape, outside click) does nothing', () => {
        const { result } = renderHook(() => useMenuAction());
        const action = vi.fn();

        result.current.defer(action)();
        result.current.onCloseAutoFocus();
        result.current.onCloseAutoFocus();

        expect(action).toHaveBeenCalledTimes(1);
    });

    it('closing without a selection runs nothing', () => {
        const { result } = renderHook(() => useMenuAction());

        expect(() => result.current.onCloseAutoFocus()).not.toThrow();
    });

    it('the last selection wins', () => {
        const { result } = renderHook(() => useMenuAction());
        const edit = vi.fn();
        const del = vi.fn();

        result.current.defer(edit)();
        result.current.defer(del)();
        result.current.onCloseAutoFocus();

        expect(edit).not.toHaveBeenCalled();
        expect(del).toHaveBeenCalledTimes(1);
    });
});
