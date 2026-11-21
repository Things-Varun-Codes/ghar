// `npm run smoke`: every listed route mounts cleanly. SMOKE_NO_GOOGLE=1 strips
// GOOGLE_MAPS_API_KEY and also checks the location field is a plain, typeable input.
import { defineSmokeConfig } from './harness.mjs';

export default defineSmokeConfig({
    name: 'smoke',
    port: 8765,
    database: 'ghar_smoke',
    overrides: {
        RESEND_API_KEY: 're_test_smoke',
        // Shared store and a real queue: /healthz reads heartbeats written by
        // separate scheduler and worker processes.
        CACHE_STORE: 'database',
        QUEUE_CONNECTION: 'database',
        // Placeholders so webpush doesn't crash when the Notifications page renders.
        VAPID_SUBJECT: 'mailto:smoke@example.test',
        VAPID_PRIVATE_KEY: 'smoke-private-key-placeholder',
        // '' rather than unset overrides any value in .env, and renders the typed-location path.
        ...(process.env.SMOKE_NO_GOOGLE ? { GOOGLE_MAPS_API_KEY: '' } : {}),
    },
});
