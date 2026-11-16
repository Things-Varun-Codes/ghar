import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
    ShellChromeProvider,
    useShellPageInfo,
    usePublishShellPage,
} from '@/Shell/Layouts/shell-chrome';

function Bar() {
    const info = useShellPageInfo();

    return <p data-testid="bar">{info?.title ?? '(none)'}</p>;
}

function Page({ title }: { title: string }) {
    usePublishShellPage(title);

    return null;
}

describe('shell chrome page info', () => {
    it('shows the mounted page title', () => {
        render(
            <ShellChromeProvider>
                <Bar />
                <Page title="Songs" />
            </ShellChromeProvider>,
        );

        expect(screen.getByTestId('bar').textContent).toBe('Songs');
    });

    it('follows the page from one visit to the next', () => {
        const { rerender } = render(
            <ShellChromeProvider>
                <Bar />
                <Page key="a" title="Songs" />
            </ShellChromeProvider>,
        );

        rerender(
            <ShellChromeProvider>
                <Bar />
                <Page key="b" title="Movies" />
            </ShellChromeProvider>,
        );

        expect(screen.getByTestId('bar').textContent).toBe('Movies');
    });

    it('clears when the next page publishes nothing', () => {
        const { rerender } = render(
            <ShellChromeProvider>
                <Bar />
                <Page title="Songs" />
            </ShellChromeProvider>,
        );

        rerender(
            <ShellChromeProvider>
                <Bar />
            </ShellChromeProvider>,
        );

        expect(screen.getByTestId('bar').textContent).toBe('(none)');
    });
});
