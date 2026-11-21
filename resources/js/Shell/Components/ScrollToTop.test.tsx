import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ScrollToTop from '@/Shell/Components/ScrollToTop';

function scrollTo(y: number) {
    Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
    act(() => {
        window.dispatchEvent(new Event('scroll'));
    });
}

describe('ScrollToTop', () => {
    afterEach(() => scrollTo(0));

    it('stays hidden near the top and shows a screen and a half down', () => {
        Object.defineProperty(window, 'innerHeight', {
            value: 800,
            configurable: true,
        });
        render(<ScrollToTop />);

        scrollTo(1000);
        expect(
            screen.queryByRole('button', { name: 'Back to the top' }),
        ).toBeNull();

        scrollTo(1300);
        expect(
            screen.getByRole('button', { name: 'Back to the top' }),
        ).toBeTruthy();
    });

    it('scrolls the page to the top', () => {
        const spy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
        render(<ScrollToTop />);
        scrollTo(5000);

        fireEvent.click(
            screen.getByRole('button', { name: 'Back to the top' }),
        );

        expect(spy).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
        spy.mockRestore();
    });
});
