// Separate from vite.config.ts so a unit test doesn't load the laravel, Wayfinder
// or Sentry plugins.
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./resources/js', import.meta.url)),
        },
    },
    test: {
        environment: 'jsdom',
        globals: false,
        // tools/eslint-rules/__tests__ runs through `npm run test:rules`.
        include: ['resources/js/**/*.test.ts', 'resources/js/**/*.test.tsx'],
        setupFiles: ['resources/js/test/setup.ts'],
        clearMocks: true,
        restoreMocks: true,
    },
});
