<?php

return [
    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    // Place search. Point it at your own Photon to keep searches in-house.
    'photon' => [
        // Empty counts as unset: compose passes an empty string through.
        'url' => env('PHOTON_URL') ?: 'https://photon.komoot.io',
    ],

    // The map's tiles, fetched by the server. Any host laid out like OpenFreeMap works.
    'map' => [
        // Empty counts as unset: compose passes an empty string through.
        'url' => env('MAP_TILES_URL') ?: 'https://tiles.openfreemap.org',
    ],

    // No 'fake' default on purpose: unset in production, the feature that needs it stays off.
    'image_ai' => [
        'provider' => env('IMAGE_AI_PROVIDER'),
        'url' => env('IMAGE_AI_URL'),
        'key' => env('IMAGE_AI_KEY'),
        'model' => env('IMAGE_AI_MODEL'),
        'size' => env('IMAGE_AI_SIZE'),
        'disk' => (require __DIR__.'/shell.php')['media_disk'],
    ],

    // Read at request time and handed to the page, so one prebuilt image serves any install.
    'sentry_browser' => [
        'dsn' => env('SENTRY_BROWSER_DSN'),
    ],
];
