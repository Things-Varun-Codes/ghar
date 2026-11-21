// `npm run smoke-loadmore`: fault injection on the load-more cursor requests.
import { defineSmokeConfig } from './harness.mjs';

export default defineSmokeConfig({
    name: 'loadmore',
    port: 8877,
    database: 'ghar_smoke_loadmore',
    overrides: {
        CACHE_STORE: 'array',
        RESEND_API_KEY: 're_test_loadmore_smoke',
        VAPID_SUBJECT: 'mailto:loadmore-smoke@example.test',
        VAPID_PRIVATE_KEY: 'loadmore-smoke-private-key-placeholder',
    },
});
