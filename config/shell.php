<?php

return [
    // `local` keeps photos on this server's disk; `s3` uses the bucket in config/filesystems.php.
    // `?:` rather than env()'s default, so an empty MEDIA_DISK= also means `local`.
    'media_disk' => (static function (string $disk): string {
        if (! in_array($disk, ['local', 's3'], true)) {
            throw new InvalidArgumentException("MEDIA_DISK must be 'local' or 's3', not '{$disk}'.");
        }

        return $disk;
    })(strtolower((string) (env('MEDIA_DISK') ?: 'local'))),

    // The scheduler ticks every minute, so three minutes allows for missed ticks. The queue's
    // one worker is shared with photo conversions, so a heartbeat can wait behind a big
    // upload. docker-entrypoint.sh touches boot_marker; heartbeats count as healthy for
    // boot_grace_seconds after it.
    'health' => [
        'scheduler_stale_after_seconds' => 180,
        'queue_stale_after_seconds' => 600,
        'boot_grace_seconds' => 300,
        'boot_marker' => storage_path('framework/container-started-at'),
        'min_free_disk_bytes' => 512 * 1024 * 1024,
    ],
];
