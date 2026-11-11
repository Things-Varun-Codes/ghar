<?php

namespace Tests\Feature\History;

use App\MiniApps\History\Models\Event;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class CalendarControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('s3');
        Storage::disk('s3')->buildTemporaryUrlsUsing(
            fn (string $path, \DateTimeInterface $expiration) => 'https://fake-bucket.example.com/'.$path.'?signed=1'
        );
    }

    public function test_renders_calendar_inertia_page_for_authed_user(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/apps/our-history/calendar')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('MiniApps/History/Pages/Calendar')
                ->has('events')
                ->has('onThisDay')
                ->has('availableYears')
                ->has('year')
                ->has('eventsCount')
            );
    }

    public function test_year_query_param_filters_events_to_that_year(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        Event::factory()->create(['occurred_on' => '2022-04-04', 'creator_id' => $user->id]);
        Event::factory()->create(['occurred_on' => '2023-06-15', 'creator_id' => $user->id]);
        Event::factory()->create(['occurred_on' => '2023-09-01', 'creator_id' => $user->id]);
        Event::factory()->create(['occurred_on' => '2024-12-31', 'creator_id' => $user->id]);

        $response = $this->actingAs($user)->get('/apps/our-history/calendar?year=2023');

        $events = $response->inertiaProps('events');
        $this->assertCount(2, $events, 'Only the two 2023 events should be returned');
        foreach ($events as $event) {
            $this->assertSame(2023, $event['year']);
        }
        $this->assertSame(2023, $response->inertiaProps('year'));
        $this->assertSame(2, $response->inertiaProps('eventsCount'));
    }

    public function test_defaults_to_most_recent_year_with_events(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        Event::factory()->create(['occurred_on' => '2021-03-02', 'creator_id' => $user->id]);
        Event::factory()->create(['occurred_on' => '2023-08-08', 'creator_id' => $user->id]);

        $response = $this->actingAs($user)->get('/apps/our-history/calendar');

        $this->assertSame(2023, $response->inertiaProps('year'), 'Default year is the most recent with events');
        $events = $response->inertiaProps('events');
        $this->assertCount(1, $events);
        $this->assertSame(2023, $events[0]['year']);
        $this->assertSame([2023, 2021], $response->inertiaProps('availableYears'));
    }

    public function test_on_this_day_returns_cross_year_month_day_matches(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        // Two events sharing TODAY's month+day, in prior years (the anniversary case).
        $lastYear = today()->subYears(1)->format('Y-m-d');
        $twoYearsAgo = today()->subYears(2)->format('Y-m-d');
        // A control event on a different day-of-year that must NOT surface.
        $otherDay = today()->subDays(40)->subYears(1)->format('Y-m-d');

        Event::factory()->create(['occurred_on' => $lastYear, 'title' => 'Anniversary A', 'creator_id' => $user->id]);
        Event::factory()->create(['occurred_on' => $twoYearsAgo, 'title' => 'Anniversary B', 'creator_id' => $user->id]);
        Event::factory()->create(['occurred_on' => $otherDay, 'title' => 'Unrelated', 'creator_id' => $user->id]);

        $response = $this->actingAs($user)->get('/apps/our-history/calendar');

        $onThisDay = $response->inertiaProps('onThisDay');
        $this->assertCount(2, $onThisDay, 'Only the two same-month+day events should surface');
        $titles = array_column($onThisDay, 'title');
        $this->assertContains('Anniversary A', $titles);
        $this->assertContains('Anniversary B', $titles);
        $this->assertNotContains('Unrelated', $titles);

        // Most-recent first (orderByDesc occurred_on).
        $this->assertSame('Anniversary A', $onThisDay[0]['title']);
    }

    public function test_empty_year_returns_empty_events_with_available_years(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        Event::factory()->create(['occurred_on' => '2024-02-02', 'creator_id' => $user->id]);

        $response = $this->actingAs($user)->get('/apps/our-history/calendar?year=2099');

        $this->assertSame([], $response->inertiaProps('events'));
        $this->assertSame(0, $response->inertiaProps('eventsCount'));
        $this->assertSame(2099, $response->inertiaProps('year'));
        $this->assertSame([2024], $response->inertiaProps('availableYears'));
    }

    public function test_unauthenticated_redirects_to_login(): void
    {
        $this->get('/apps/our-history/calendar')->assertRedirect('/login');
    }
}
