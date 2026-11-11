import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { google } from 'laravel-vite-plugin/fonts';
import { defineConfig } from 'vite';

export default defineConfig({
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
                google('Instrument Sans', {
                    weights: [400, 500, 600],
                }),
                google('Instrument Serif', {
                    weights: [400],
                }),
                google('Patrick Hand', {
                    weights: [400],
                }),
                google('Special Elite', {
                    weights: [400],
                }),
                google('Fredoka', {
                    weights: [400, 500, 600],
                }),
            ],
        }),
        inertia(),
        react({
            babel: {
                plugins: ['babel-plugin-react-compiler'],
            },
        }),
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
});
