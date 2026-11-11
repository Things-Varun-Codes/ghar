<?php

return [
    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    /**
     * Public and referrer-restricted. One value both reaches the client and gates the Google
     * CSP origins, so the two can't disagree.
     */
    'google_maps' => [
        'key' => env('GOOGLE_MAPS_API_KEY'),
    ],

    // No 'fake' default on purpose: MailboxServiceProvider throws in production when this is
    // unset, rather than silently no-opping.
    'bouquet' => [
        'provider' => env('BOUQUET_IMAGE_PROVIDER'),
        'cf_account_id' => env('CLOUDFLARE_ACCOUNT_ID'),
        'cf_token' => env('CLOUDFLARE_WORKERS_AI_TOKEN'),
        'cf_model' => env('CLOUDFLARE_AI_IMAGE_MODEL', '@cf/black-forest-labs/flux-1-schnell'),
        'disk' => (require __DIR__.'/shell.php')['media_disk'],
    ],

    // Read at request time and handed to the page, so one prebuilt image serves any install.
    'sentry_browser' => [
        'dsn' => env('SENTRY_BROWSER_DSN'),
    ],
];
