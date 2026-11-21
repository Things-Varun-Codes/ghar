// `npm run smoke`: every listed route mounts cleanly.
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
        // A dead address, so a place search that slips into a smoke run fails instead of going out.
        PHOTON_URL: 'http://127.0.0.1:9',
    },
});
