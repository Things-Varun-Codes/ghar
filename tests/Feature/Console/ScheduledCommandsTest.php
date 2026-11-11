<?php

namespace Tests\Feature\Console;

use Illuminate\Console\Scheduling\Schedule;
use Tests\TestCase;

class ScheduledCommandsTest extends TestCase
{
    public function test_queue_prune_failed_is_scheduled_weekly_with_the_ninety_day_retention_window(): void
    {
        $schedule = app(Schedule::class);

        $event = $this->findEventByCommandSubstring($schedule, 'queue:prune-failed');

        $this->assertNotNull($event, 'queue:prune-failed must be registered on the scheduler');
        $this->assertStringContainsString('--hours=2160', $event->command, '90-day retention window (90 * 24 = 2160 hours) must be applied');
        $this->assertSame('30 3 * * 0', $event->expression, 'queue:prune-failed must run weekly at 03:30 on Sunday');
    }

    public function test_history_prune_media_is_still_scheduled_daily(): void
    {
        $schedule = app(Schedule::class);

        $event = $this->findEventByCommandSubstring($schedule, 'history:prune-media');

        $this->assertNotNull($event, 'history:prune-media must remain registered on the scheduler');
        $this->assertSame('0 3 * * *', $event->expression, 'history:prune-media must remain scheduled daily at 03:00');
    }

    private function findEventByCommandSubstring(Schedule $schedule, string $needle): ?object
    {
        foreach ($schedule->events() as $event) {
            if (str_contains($event->command, $needle)) {
                return $event;
            }
        }

        return null;
    }
}
