<?php

namespace Tests\Feature\History;

use App\MiniApps\History\Models\Event;
use App\MiniApps\History\Support\OnThisDay;
use App\Shell\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class OnThisDayTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['shell.timezone' => 'UTC']);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_earlier_years_on_this_month_and_day_newest_first(): void
    {
        Carbon::setTestNow('2026-06-14 10:00:00');

        $older = Event::factory()->create(['occurred_on' => '2019-06-14', 'title' => 'Older']);
        $newer = Event::factory()->create(['occurred_on' => '2024-06-14', 'title' => 'Newer']);
        Event::factory()->create(['occurred_on' => '2026-06-14', 'title' => 'This year']);
        Event::factory()->create(['occurred_on' => '2027-06-14', 'title' => 'Next year']);
        Event::factory()->create(['occurred_on' => '2024-06-15', 'title' => 'Day after']);
        Event::factory()->create(['occurred_on' => '2024-07-14', 'title' => 'Month after']);
        Event::factory()->deleted()->create(['occurred_on' => '2023-06-14', 'title' => 'Deleted']);

        $this->assertSame([$newer->id, $older->id], OnThisDay::query()->pluck('id')->all());
    }

    /** @return array<string, array{string, list<string>}> */
    public static function leapDays(): array
    {
        return [
            'Feb 28 of a non-leap year also brings Feb 29' => ['2027-02-28', ['2024-02-29', '2023-02-28']],
            'Feb 28 of a leap year leaves Feb 29 to its own day' => ['2028-02-28', ['2023-02-28']],
            'Feb 29 of a leap year' => ['2028-02-29', ['2024-02-29']],
            'Mar 1 never takes Feb 29' => ['2027-03-01', ['2022-03-01']],
        ];
    }

    /** @param  list<string>  $expected */
    #[DataProvider('leapDays')]
    public function test_a_leap_day_comes_round_on_feb_28_in_a_non_leap_year(string $today, array $expected): void
    {
        Carbon::setTestNow("{$today} 10:00:00");

        foreach (['2024-02-29', '2023-02-28', '2022-03-01'] as $date) {
            Event::factory()->create(['occurred_on' => $date]);
        }

        $this->assertSame(
            $expected,
            OnThisDay::query()->get()->map(fn (Event $event): string => $event->occurred_on->toDateString())->all(),
        );
    }

    public function test_today_is_the_households_day_not_utcs(): void
    {
        // 20:00 UTC on 14 March is 01:30 on the 15th in Kolkata.
        Carbon::setTestNow('2026-03-14 20:00:00');
        config(['shell.timezone' => 'Asia/Kolkata']);

        Event::factory()->create(['occurred_on' => '2024-03-14', 'title' => 'UTC day']);
        $household = Event::factory()->create(['occurred_on' => '2024-03-15', 'title' => 'Household day']);

        $this->assertSame([$household->id], OnThisDay::query()->pluck('id')->all());

        $user = User::factory()->create();
        $timeline = $this->actingAs($user)->get('/apps/our-history')->assertOk();
        $this->assertSame(['Household day'], array_column($timeline->inertiaProps('onThisDay'), 'title'));

        $calendar = $this->actingAs($user)->get('/apps/our-history/calendar')->assertOk();
        $this->assertSame(['Household day'], array_column($calendar->inertiaProps('onThisDay'), 'title'));
    }

    public function test_comes_round_on_matches_birthdays_the_same_way(): void
    {
        $nonLeap = CarbonImmutable::parse('2027-02-28');

        $this->assertTrue(OnThisDay::comesRoundOn(CarbonImmutable::parse('1992-02-29'), $nonLeap));
        $this->assertTrue(OnThisDay::comesRoundOn(CarbonImmutable::parse('1992-02-28'), $nonLeap));
        $this->assertFalse(OnThisDay::comesRoundOn(CarbonImmutable::parse('1992-02-29'), CarbonImmutable::parse('2028-02-28')));
        $this->assertFalse(OnThisDay::comesRoundOn(CarbonImmutable::parse('2027-02-28'), $nonLeap), 'Not in the same year');
        $this->assertFalse(OnThisDay::comesRoundOn(CarbonImmutable::parse('1992-03-01'), $nonLeap));
    }
}
