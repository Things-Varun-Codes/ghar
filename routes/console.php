<?php

use App\Shell\Jobs\RecordQueueHeartbeat;
use App\Shell\Support\Heartbeat;
use Illuminate\Support\Facades\Schedule;

/**
 * Retention only, 90 days. Off-peak, and clear of History's media prune.
 */
Schedule::command('queue:prune-failed --hours=2160')
    ->weeklyOn(0, '03:30')
    ->onOneServer()
    ->runInBackground();

Schedule::call(fn () => Heartbeat::record(Heartbeat::SCHEDULER))
    ->name('health:scheduler-heartbeat')
    ->everyMinute();

Schedule::job(new RecordQueueHeartbeat)->everyMinute();
