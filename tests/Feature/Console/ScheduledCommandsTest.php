<?php

namespace Tests\Feature\Console;

use App\MiniApps\History\Models\Event;
use App\Shell\Support\Region;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Carbon;
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

    public function test_trashed_moments_are_pruned_daily(): void
    {
        $schedule = app(Schedule::class);

        $event = $this->findEventByCommandSubstring($schedule, 'model:prune');

        $this->assertNotNull($event, 'model:prune must remain registered on the scheduler');
        $this->assertStringContainsString(Event::class, $event->command);
        $this->assertSame('0 3 * * *', $event->expression, 'model:prune must remain scheduled daily at 03:00');
    }

    public function test_history_morning_memories_runs_hourly_through_the_households_morning(): void
    {
        config(['shell.timezone' => 'Asia/Kolkata']);
        app()->forgetInstance(Schedule::class);
        $event = $this->findEventByCommandSubstring(app(Schedule::class), 'history:morning-memories');

        $this->assertNotNull($event, 'history:morning-memories must be registered on the scheduler');
        $this->assertSame('0 * * * *', $event->expression);
        $this->assertSame('Asia/Kolkata', $event->timezone, "the morning is the household's");
        $this->assertTrue($event->onOneServer);

        // between() reads the clock when the schedule is built, as each schedule:run does.
        $runsAt = function (string $time): bool {
            Carbon::setTestNow(Carbon::parse("2026-06-14 {$time}", Region::timezone()));
            app()->forgetInstance(Schedule::class);
            $event = $this->findEventByCommandSubstring(app(Schedule::class), 'history:morning-memories');

            return $event !== null && $event->isDue(app()) && $event->filtersPass(app());
        };

        try {
            $this->assertFalse($runsAt('08:00'));
            $this->assertTrue($runsAt('09:00'));
            $this->assertTrue($runsAt('11:00'));
            $this->assertTrue($runsAt('12:00'));
            $this->assertFalse($runsAt('13:00'));
            $this->assertFalse($runsAt('09:30'), 'on the hour only');
        } finally {
            Carbon::setTestNow();
        }
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
