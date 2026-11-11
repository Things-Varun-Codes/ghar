<?php

namespace App\Shell\Jobs;

use App\Shell\Support\Heartbeat;
use Illuminate\Contracts\Queue\ShouldBeUniqueUntilProcessing;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Unique so a dead worker doesn't collect one of these per minute in `jobs`. The lock
 * expires in case a job is ever lost, or the heartbeat would stop.
 */
class RecordQueueHeartbeat implements ShouldBeUniqueUntilProcessing, ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public int $uniqueFor = 300;

    public function handle(): void
    {
        Heartbeat::record(Heartbeat::QUEUE);
    }
}
