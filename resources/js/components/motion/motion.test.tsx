import { act, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Listener = (event: { detail: { visit: unknown } }) => void;

const router = vi.hoisted(() => {
    const listeners: Listener[] = [];

    return {
        listeners,
        on: (_name: string, listener: Listener) => {
            listeners.push(listener);

            return () => {};
        },
    };
});

import { Fade, Pop, Reveal, Settle, SettleItem } from '@/components/motion';
import { installMotionGate, pageIsOpening } from '@/lib/motion';

installMotionGate(router as never);

function visit(href: string, extra: Record<string, unknown> = {}) {
    router.listeners.forEach((listener) =>
        listener({
            detail: {
                visit: {
                    url: new URL(href, window.location.href),
                    prefetch: false,
                    only: [],
                    except: [],
                    ...extra,
                },
            },
        }),
    );
}

function List({ count, reveal }: { count: number; reveal?: boolean }) {
    return (
        <Settle>
            {Array.from({ length: count }, (_, i) => (
                <SettleItem key={i} index={i} reveal={reveal}>
                    <span>row {i}</span>
                </SettleItem>
            ))}
        </Settle>
    );
}

const settling = () =>
    screen
        .getAllByText(/^row /)
        .map((row) => row.parentElement?.getAttribute('data-settle') ?? '-');

describe('the settle gate', () => {
    beforeEach(() => {
        visit('/somewhere-else');
    });

    it('settles a page that is being opened', () => {
        expect(pageIsOpening()).toBe(true);
    });

    it('does not settle a page restored by back or forward', () => {
        window.dispatchEvent(new PopStateEvent('popstate'));

        expect(pageIsOpening()).toBe(false);
    });

    it('does not settle a visit to the page already shown', () => {
        visit(window.location.pathname + '?sort=oldest');

        expect(pageIsOpening()).toBe(false);
    });

    it('ignores partial reloads such as load more', () => {
        window.dispatchEvent(new PopStateEvent('popstate'));
        visit('/somewhere-else', { only: ['items'] });

        expect(pageIsOpening()).toBe(false);
    });
});

describe('Settle', () => {
    beforeEach(() => {
        visit('/somewhere-else');
    });

    it('rises in the rows of the first render only', () => {
        const { rerender } = render(<List count={3} />);

        expect(settling()).toEqual(['in', 'in', 'in']);

        rerender(<List count={5} />);

        expect(settling()).toEqual(['in', 'in', 'in', '-', '-']);
    });

    it('shows a restored page in place', () => {
        window.dispatchEvent(new PopStateEvent('popstate'));
        render(<List count={2} />);

        expect(settling()).toEqual(['-', '-']);
    });
});

describe('Settle with reveal', () => {
    const watched: Element[] = [];
    let report: IntersectionObserverCallback = () => {};

    beforeEach(() => {
        visit('/somewhere-else');
        watched.length = 0;
        vi.stubGlobal(
            'IntersectionObserver',
            class {
                constructor(callback: IntersectionObserverCallback) {
                    report = callback;
                }
                observe(el: Element) {
                    watched.push(el);
                }
                unobserve() {}
                disconnect() {}
            },
        );
    });

    const enterView = (i: number) =>
        act(() =>
            report(
                [{ target: watched[i], isIntersecting: true } as never],
                {} as never,
            ),
        );

    it('rises each row in as it enters the view, later rows too', () => {
        const { rerender } = render(<List count={2} reveal />);
        rerender(<List count={3} reveal />);

        expect(settling()).toEqual(['-', '-', '-']);

        enterView(0);
        enterView(2);

        expect(settling()).toEqual(['in', '-', 'in']);
    });

    it('shows a restored page in place', () => {
        window.dispatchEvent(new PopStateEvent('popstate'));
        render(<List count={2} reveal />);

        expect(settling()).toEqual(['-', '-']);
        expect(watched).toHaveLength(0);
    });
});

describe('presence presets', () => {
    function Toggle({
        Preset,
    }: {
        Preset: typeof Fade | typeof Pop | typeof Reveal;
    }) {
        const [show, setShow] = useState(true);

        return (
            <>
                <button type="button" onClick={() => setShow((s) => !s)}>
                    toggle
                </button>
                <Preset show={show}>
                    <span>content</span>
                </Preset>
            </>
        );
    }

    it.each([
        ['Fade', Fade],
        ['Pop', Pop],
        ['Reveal', Reveal],
    ] as const)(
        '%s unmounts what it hides and brings it back',
        async (_, Preset) => {
            render(<Toggle Preset={Preset} />);
            expect(screen.getByText('content')).toBeTruthy();

            await act(async () => screen.getByText('toggle').click());
            expect(screen.queryByText('content')).toBeNull();

            await act(async () => screen.getByText('toggle').click());
            expect(screen.getByText('content')).toBeTruthy();
        },
    );
});
