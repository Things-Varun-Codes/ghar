import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useResponsiveSheet } from '@/hooks/use-responsive-sheet';

const layout = vi.hoisted(() => ({ phone: false, sidebar: false }));

vi.mock('@/hooks/use-breakpoint', () => ({
    useIsPhone: () => layout.phone,
    useHasSidebar: () => layout.sidebar,
}));

function sideAt(
    width: 'phone' | 'tablet' | 'desktop',
    panelFrom?: 'md' | 'lg',
) {
    layout.phone = width === 'phone';
    layout.sidebar = width === 'desktop';

    return renderHook(() => useResponsiveSheet({ open: false, panelFrom }))
        .result.current.side;
}

beforeEach(() => {
    document.body.style.overflow = '';
});

describe('useResponsiveSheet', () => {
    it('rises from the bottom on a phone and slides in from the right from md', () => {
        expect(sideAt('phone')).toBe('bottom');
        expect(sideAt('tablet')).toBe('right');
        expect(sideAt('desktop')).toBe('right');
    });

    it('stays a bottom sheet until the sidebar shows when asked to', () => {
        expect(sideAt('phone', 'lg')).toBe('bottom');
        expect(sideAt('tablet', 'lg')).toBe('bottom');
        expect(sideAt('desktop', 'lg')).toBe('right');
    });

    it('holds the page still only while open', () => {
        const { rerender, unmount } = renderHook(
            ({ open }) => useResponsiveSheet({ open }),
            { initialProps: { open: false } },
        );

        expect(document.body.style.overflow).toBe('');

        rerender({ open: true });
        expect(document.body.style.overflow).toBe('hidden');

        unmount();
        expect(document.body.style.overflow).toBe('');
    });
});
