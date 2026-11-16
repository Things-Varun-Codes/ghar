import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useReturnFocus } from './use-return-focus';

function button(): HTMLButtonElement {
    const el = document.createElement('button');
    document.body.appendChild(el);

    return el;
}

describe('useReturnFocus', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('returns focus to what had it when the dialog opened', () => {
        const trigger = button();
        trigger.focus();
        const { result } = renderHook(() => useReturnFocus());

        result.current.onOpenAutoFocus(new Event('open'));
        button().focus();

        const close = new Event('close', { cancelable: true });
        result.current.onCloseAutoFocus(close);

        expect(close.defaultPrevented).toBe(true);
        expect(document.activeElement).toBe(trigger);
    });

    it("leaves Radix's default alone when nothing was focused", () => {
        const { result } = renderHook(() => useReturnFocus());

        result.current.onOpenAutoFocus(new Event('open'));
        const close = new Event('close', { cancelable: true });
        result.current.onCloseAutoFocus(close);

        expect(close.defaultPrevented).toBe(false);
    });

    it("steps aside when the caller's handler prevents default", () => {
        const trigger = button();
        const other = button();
        trigger.focus();
        const onCloseAutoFocus = vi.fn((event: Event) => {
            event.preventDefault();
            other.focus();
        });
        const { result } = renderHook(() =>
            useReturnFocus({ onCloseAutoFocus }),
        );

        result.current.onOpenAutoFocus(new Event('open'));
        result.current.onCloseAutoFocus(
            new Event('close', { cancelable: true }),
        );

        expect(onCloseAutoFocus).toHaveBeenCalledTimes(1);
        expect(document.activeElement).toBe(other);
    });

    it('skips a trigger that has left the page', () => {
        const trigger = button();
        trigger.focus();
        const { result } = renderHook(() => useReturnFocus());

        result.current.onOpenAutoFocus(new Event('open'));
        trigger.remove();
        const close = new Event('close', { cancelable: true });
        result.current.onCloseAutoFocus(close);

        expect(close.defaultPrevented).toBe(false);
    });
});
