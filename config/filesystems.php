<?php

return [
    'default' => env('FILESYSTEM_DISK', 'local'),

    'disks' => [
        // Media with MEDIA_DISK=local. `serve` gives it signed, expiring URLs at /storage/…,
        // the same contract as the bucket's presigned ones.
        'local' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'serve' => true,
            'throw' => false,
            'report' => false,
        ],

        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => rtrim(env('APP_URL', 'http://localhost'), '/').'/storage',
            'visibility' => 'public',
            'throw' => false,
            'report' => false,
        ],

        // Any S3-compatible store: Cloudflare R2, Backblaze B2, MinIO, Garage, AWS S3. The
        // bucket stays private; every read is a short-lived presigned URL. The database
        // stores object keys, never URLs.
        's3' => [
            'driver' => 's3',
            'key' => env('S3_ACCESS_KEY_ID'),
            'secret' => env('S3_SECRET_ACCESS_KEY'),
            'region' => env('S3_REGION') ?: 'auto',
            'bucket' => env('S3_BUCKET'),
            'endpoint' => env('S3_ENDPOINT') ?: null,
            'use_path_style_endpoint' => (bool) env('S3_USE_PATH_STYLE_ENDPOINT', true),
            'throw' => false,
            'report' => false,
        ],
    ],

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],
];
