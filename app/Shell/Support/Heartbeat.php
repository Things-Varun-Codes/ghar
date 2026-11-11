<?php

namespace App\Shell\Support;

use Illuminate\Support\Facades\Cache;

/**
 * Timestamps /healthz reads to prove the background processes are running. The queue key
 * goes through a job, so it only moves when a worker actually consumes.
 */
final class Heartbeat
{
    public const SCHEDULER = 'health:scheduler_last_seen';

    public const QUEUE = 'health:queue_last_seen';

    public static function record(string $key): void
    {
        Cache::forever($key, time());
    }
}
