import type { Page } from '@inertiajs/core';
import type { router as inertiaRouter } from '@inertiajs/react';

import type { Auth, Theme } from '@/types/auth';

const DEVICE = {
    light: '(prefers-color-scheme: light)',
    dark: '(prefers-color-scheme: dark)',
};

/** Puts the chosen theme on <html> and the browser bar; 'system' leaves both to the device. */
export function applyTheme(theme: Theme | undefined): void {
    const root = document.documentElement;
    const fixed = theme === 'light' || theme === 'dark' ? theme : undefined;

    // The map repaints on every data-theme mutation, even one that writes the same value.
    if (root.dataset.theme !== fixed) {
        if (fixed) {
            root.dataset.theme = fixed;
        } else {
            delete root.dataset.theme;
        }
    }

    document
        .querySelectorAll<HTMLMetaElement>(
            'meta[name="theme-color"][data-scheme]',
        )
        .forEach((meta) => {
            const scheme = meta.dataset.scheme as keyof typeof DEVICE;
            meta.media = fixed
                ? fixed === scheme
                    ? 'all'
                    : 'not all'
                : DEVICE[scheme];
        });
}

// Blade sets the theme on a full load; signing in or out, or saving it, is an Inertia visit.
// `navigate` skips a visit that replaces its history entry, as saving the setting does, and
// `success` skips back and forward, so it takes both.
export function installTheme(router: typeof inertiaRouter): void {
    const sync = (event: { detail: { page: Page } }) =>
        applyTheme(
            (event.detail.page.props.auth as Auth | undefined)?.user?.theme,
        );

    router.on('navigate', sync);
    router.on('success', sync);
}
