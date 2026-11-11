import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePullToRefresh } from './usePullToRefresh';

const { routerReload } = vi.hoisted(() => ({
    routerReload: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({
    router: { reload: routerReload },
}));

let container: HTMLDivElement;
let originalMatchMedia: typeof window.matchMedia;
let originalRaf: typeof window.requestAnimationFrame;
let originalCaf: typeof window.cancelAnimationFrame;
let originalScrollY: number;

function stubTouchDevice(matches: boolean) {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
}

function stubSynchronousRaf() {
    window.requestAnimationFrame = vi.fn(
        (callback: FrameRequestCallback): number => {
            callback(0);

            return 1;
        },
    );
    window.cancelAnimationFrame = vi.fn();
}

function setScrollY(value: number) {
    Object.defineProperty(window, 'scrollY', {
        value,
        configurable: true,
        writable: true,
    });
}

function touchEvent(
    type: string,
    clientY: number,
    opts: { cancelable?: boolean } = {},
): Event {
    const event = new Event(type, {
        bubbles: true,
        cancelable: opts.cancelable ?? true,
    });

    Object.defineProperty(event, 'touches', {
        value: [{ clientY }],
        configurable: true,
    });

    return event;
}

beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    originalMatchMedia = window.matchMedia;
    originalRaf = window.requestAnimationFrame;
    originalCaf = window.cancelAnimationFrame;
    originalScrollY = window.scrollY;

    stubTouchDevice(true);
    stubSynchronousRaf();
    setScrollY(0);
});

afterEach(() => {
    document.body.removeChild(container);
    document.body.style.overflow = '';
    window.matchMedia = originalMatchMedia;
    window.requestAnimationFrame = originalRaf;
    window.cancelAnimationFrame = originalCaf;
    Object.defineProperty(window, 'scrollY', {
        value: originalScrollY,
        configurable: true,
        writable: true,
    });
});

describe('usePullToRefresh', () => {
    it('non-touch short-circuit: on desktop the hook attaches no listeners at all', () => {
        stubTouchDevice(false);

        const { result } = renderHook(() => usePullToRefresh());

        act(() => {
            container.dispatchEvent(touchEvent('touchstart', 0));
        });
        act(() => {
            container.dispatchEvent(touchEvent('touchmove', 200));
        });
        act(() => {
            container.dispatchEvent(touchEvent('touchend', 200));
        });

        expect(result.current.pullDistance).toBe(0);
        expect(routerReload).not.toHaveBeenCalled();
    });

    it('applies 50% drag resistance', () => {
        const { result } = renderHook(() => usePullToRefresh());

        act(() => {
            container.dispatchEvent(touchEvent('touchstart', 0));
        });
        act(() => {
            container.dispatchEvent(touchEvent('touchmove', 100));
        });

        expect(result.current.pullDistance).toBe(50);
    });

    it('soft-caps the pull at 1.5x threshold, proportional to a custom threshold', () => {
        const { result: defaultResult } = renderHook(() => usePullToRefresh());

        act(() => {
            container.dispatchEvent(touchEvent('touchstart', 0));
        });
        act(() => {
            container.dispatchEvent(touchEvent('touchmove', 1000));
        });
        expect(defaultResult.current.pullDistance).toBe(80 * 1.5);

        const { result: customResult } = renderHook(() =>
            usePullToRefresh({ threshold: 40 }),
        );

        act(() => {
            container.dispatchEvent(touchEvent('touchstart', 0));
        });
        act(() => {
            container.dispatchEvent(touchEvent('touchmove', 1000));
        });
        expect(customResult.current.pullDistance).toBe(40 * 1.5);
    });

    it('calls preventDefault once the delta passes 8px on a cancelable event, not below', () => {
        renderHook(() => usePullToRefresh());

        act(() => {
            container.dispatchEvent(touchEvent('touchstart', 0));
        });

        const smallMove = touchEvent('touchmove', 5);
        const smallSpy = vi.spyOn(smallMove, 'preventDefault');
        act(() => {
            container.dispatchEvent(smallMove);
        });
        expect(smallSpy).not.toHaveBeenCalled();

        const bigMove = touchEvent('touchmove', 20);
        const bigSpy = vi.spyOn(bigMove, 'preventDefault');
        act(() => {
            container.dispatchEvent(bigMove);
        });
        expect(bigSpy).toHaveBeenCalledTimes(1);
    });

    it('resets pull distance to zero on an upward drag rather than going negative', () => {
        const { result } = renderHook(() => usePullToRefresh());

        act(() => {
            container.dispatchEvent(touchEvent('touchstart', 100));
        });
        act(() => {
            container.dispatchEvent(touchEvent('touchmove', 50));
        });

        expect(result.current.pullDistance).toBe(0);
    });

    it('refuses to arm when scrollY is non-zero at touchstart', () => {
        setScrollY(100);

        const { result } = renderHook(() => usePullToRefresh());

        act(() => {
            container.dispatchEvent(touchEvent('touchstart', 0));
        });
        act(() => {
            container.dispatchEvent(touchEvent('touchmove', 200));
        });

        expect(result.current.pullDistance).toBe(0);
    });

    it('refuses to arm when the body has an inline overflow:hidden lock', () => {
        document.body.style.overflow = 'hidden';

        const { result } = renderHook(() => usePullToRefresh());

        act(() => {
            container.dispatchEvent(touchEvent('touchstart', 0));
        });
        act(() => {
            container.dispatchEvent(touchEvent('touchmove', 200));
        });

        expect(result.current.pullDistance).toBe(0);
    });

    it('refuses to arm when the touchstart target is inside a [data-scroll-container] opt-out element', () => {
        container.setAttribute('data-scroll-container', '');

        const { result } = renderHook(() => usePullToRefresh());

        act(() => {
            container.dispatchEvent(touchEvent('touchstart', 0));
        });
        act(() => {
            container.dispatchEvent(touchEvent('touchmove', 200));
        });

        expect(result.current.pullDistance).toBe(0);
    });

    it('releasing below threshold issues no reload and resets pull distance', () => {
        const { result } = renderHook(() => usePullToRefresh());

        act(() => {
            container.dispatchEvent(touchEvent('touchstart', 0));
        });
        act(() => {
            container.dispatchEvent(touchEvent('touchmove', 100));
        });
        expect(result.current.pullDistance).toBe(50);

        act(() => {
            container.dispatchEvent(touchEvent('touchend', 100));
        });

        expect(routerReload).not.toHaveBeenCalled();
        expect(result.current.pullDistance).toBe(0);
    });

    it('releasing past threshold reloads exactly once and clears on onFinish', () => {
        const { result } = renderHook(() => usePullToRefresh());

        act(() => {
            container.dispatchEvent(touchEvent('touchstart', 0));
        });
        act(() => {
            container.dispatchEvent(touchEvent('touchmove', 200));
        });
        expect(result.current.pullDistance).toBe(100);

        act(() => {
            container.dispatchEvent(touchEvent('touchend', 200));
        });

        expect(routerReload).toHaveBeenCalledTimes(1);
        expect(result.current.refreshing).toBe(true);

        const options = routerReload.mock.calls[0][0] as {
            onFinish: () => void;
        };
        act(() => {
            options.onFinish();
        });

        expect(result.current.refreshing).toBe(false);
        expect(result.current.pullDistance).toBe(0);
    });

    it('detaches listeners on unmount — a full gesture afterward triggers no reload', () => {
        const { unmount } = renderHook(() => usePullToRefresh());

        unmount();

        act(() => {
            container.dispatchEvent(touchEvent('touchstart', 0));
        });
        act(() => {
            container.dispatchEvent(touchEvent('touchmove', 200));
        });
        act(() => {
            container.dispatchEvent(touchEvent('touchend', 200));
        });

        expect(routerReload).not.toHaveBeenCalled();
    });
});
