import { beforeEach, describe, expect, it } from 'vitest';

import { applyTheme } from '@/lib/theme';

function metas() {
    return [
        ...document.querySelectorAll<HTMLMetaElement>('meta[data-scheme]'),
    ].map((meta) => `${meta.dataset.scheme} ${meta.media}`);
}

describe('applyTheme', () => {
    beforeEach(() => {
        delete document.documentElement.dataset.theme;
        document.head.innerHTML = `
            <meta name="theme-color" data-scheme="light" content="#f6f3ee">
            <meta name="theme-color" data-scheme="dark" content="#1c1916">`;
    });

    it('pins a chosen theme on <html> and the browser bar', () => {
        applyTheme('dark');

        expect(document.documentElement.dataset.theme).toBe('dark');
        expect(metas()).toEqual(['light not all', 'dark all']);
    });

    it('leaves the system choice, and a guest, to the device', () => {
        applyTheme('light');
        applyTheme('system');

        expect(document.documentElement.dataset.theme).toBeUndefined();
        expect(metas()).toEqual([
            'light (prefers-color-scheme: light)',
            'dark (prefers-color-scheme: dark)',
        ]);

        applyTheme('dark');
        applyTheme(undefined);

        expect(document.documentElement.dataset.theme).toBeUndefined();
    });
});
