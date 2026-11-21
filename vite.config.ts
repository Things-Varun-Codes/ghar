import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import babel from '@rolldown/plugin-babel';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { google } from 'laravel-vite-plugin/fonts';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
    // Same host as APP_URL, or the hot file can name [::1], which the CSP can't list.
    server: {
        host: '127.0.0.1',
    },
    build: {
        // Sourcemaps are uploaded out of band and must not be served: no
        // sourceMappingURL comment, and nginx answers 404 for *.map.
        sourcemap: 'hidden',
    },
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
            fonts: [
                // The reading face. Light for the date, regular to read, semibold for titles.
                google('Atkinson Hyperlegible Next', {
                    weights: [300, 400, 600],
                    styles: ['normal', 'italic'],
                }),
                // The title face: a soft serif so the wordmark and page titles feel homely.
                google('Fraunces', { weights: [600] }),
                // The hand: what someone wrote on a note, coupon or citation in Our Exchange.
                // Upright only; it has no italic, so nothing on it asks for one.
                google('Kalam', { weights: [400, 700] }),
            ],
        }),
        inertia(),
        react(),
        // The compiler is most of a build's time; the dev server skips it, and the build, the
        // smokes and the release image all run it.
        command === 'build' && babel({ presets: [reactCompilerPreset()] }),
        tailwindcss(),
        wayfinder({
            formVariants: true,
        }),
        // Last, so it sees the final bundle. Off unless all four SENTRY_* are set: never
        // fall back to sentry.io with a self-hosted token.
        process.env.SENTRY_AUTH_TOKEN &&
            process.env.SENTRY_URL &&
            process.env.SENTRY_ORG &&
            process.env.SENTRY_PROJECT &&
            sentryVitePlugin({
                url: process.env.SENTRY_URL,
                org: process.env.SENTRY_ORG,
                project: process.env.SENTRY_PROJECT,
                authToken: process.env.SENTRY_AUTH_TOKEN,
                // Must match config/sentry.php's release, or uploaded maps never apply.
                ...(process.env.GHAR_VERSION
                    ? { release: { name: process.env.GHAR_VERSION } }
                    : {}),
                sourcemaps: {
                    assets: ['public/build/**/*.js', 'public/build/**/*.map'],
                },
            }),
    ],
}));
