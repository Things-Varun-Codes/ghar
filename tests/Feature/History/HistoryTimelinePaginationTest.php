<?php

namespace Tests\Feature\History;

use App\MiniApps\History\Models\Event;
use App\Shell\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class HistoryTimelinePaginationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Fake r2 disk with a temporaryUrl callback so EventResource  can call
        // getTemporaryUrl() without real AWS credentials.
        Storage::fake('s3');
        Storage::disk('s3')->buildTemporaryUrlsUsing(
            fn (string $path, \DateTimeInterface $expiration) => 'https://fake-bucket.example.com/'.$path.'?signed=1'
        );
    }

    public function test_default_order_newest_first(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        // Create events with different dates.
        Event::factory()->create(['occurred_on' => '2020-01-01', 'creator_id' => $user->id]);
        Event::factory()->create(['occurred_on' => '2023-06-15', 'creator_id' => $user->id]);
        Event::factory()->create(['occurred_on' => '2024-12-31', 'creator_id' => $user->id]);

        $response = $this->actingAs($user)->get('/apps/our-history');

        $eventsData = $response->inertiaProps('events.data');
        $this->assertNotEmpty($eventsData);

        // First event must have the latest date.
        $this->assertEquals('2024-12-31', $eventsData[0]['date']);
    }

    public function test_oldest_first_query_param_reverses_order(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        Event::factory()->create(['occurred_on' => '2020-01-01', 'creator_id' => $user->id]);
        Event::factory()->create(['occurred_on' => '2023-06-15', 'creator_id' => $user->id]);
        Event::factory()->create(['occurred_on' => '2024-12-31', 'creator_id' => $user->id]);

        $response = $this->actingAs($user)->get('/apps/our-history?order=oldest-first');

        $eventsData = $response->inertiaProps('events.data');
        $this->assertNotEmpty($eventsData);

        // First event must have the earliest date.
        $this->assertEquals('2020-01-01', $eventsData[0]['date']);

        // The 'order' prop must reflect the current order.
        $orderProp = $response->inertiaProps('order');
        $this->assertEquals('oldest-first', $orderProp);
    }

    public function test_paginator_returns_20_per_page(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        Event::factory()->count(25)->create(['creator_id' => $user->id]);

        $response = $this->actingAs($user)->get('/apps/our-history');

        $eventsData = $response->inertiaProps('events.data');
        $nextPageUrl = $response->inertiaProps('events.next_page_url');

        $this->assertCount(20, $eventsData, 'Page 1 must return exactly 20 events');
        $this->assertNotNull(
            $nextPageUrl,
            'A next-page cursor URL must exist when more than 20 events remain',
        );
        // Keyset paginator: offset meta must be absent.
        $this->assertNull($response->inertiaProps('events.last_page'));
    }

    public function test_page_two_has_remaining_events(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        Event::factory()->count(25)->create(['creator_id' => $user->id]);

        $nextPageUrl = $this->actingAs($user)
            ->get('/apps/our-history')
            ->inertiaProps('events.next_page_url');

        $this->assertNotNull($nextPageUrl, 'Page 1 must hand out a next-page cursor.');

        $eventsData = $this->actingAs($user)
            ->get($nextPageUrl)
            ->inertiaProps('events.data');

        $this->assertCount(5, $eventsData, 'Following the cursor must return the remaining 5 events');
    }

    public function test_same_day_events_tiebreak_by_created_at_desc(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        // Create 3 events all on the same occurred_on but at staggered created_at times.
        $t1 = Carbon::parse('2024-06-01 08:00:00');
        $t2 = Carbon::parse('2024-06-01 10:00:00');
        $t3 = Carbon::parse('2024-06-01 14:00:00');

        $event1 = Event::factory()->create([
            'occurred_on' => '2024-06-01',
            'title' => 'Morning',
            'creator_id' => $user->id,
            'created_at' => $t1,
        ]);

        $event2 = Event::factory()->create([
            'occurred_on' => '2024-06-01',
            'title' => 'Midday',
            'creator_id' => $user->id,
            'created_at' => $t2,
        ]);

        $event3 = Event::factory()->create([
            'occurred_on' => '2024-06-01',
            'title' => 'Afternoon',
            'creator_id' => $user->id,
            'created_at' => $t3,
        ]);

        $response = $this->actingAs($user)->get('/apps/our-history');

        $eventsData = $response->inertiaProps('events.data');
        $this->assertNotEmpty($eventsData);

        $titles = array_column($eventsData, 'title');
        $this->assertEquals('Afternoon', $titles[0], 'Created at 14:00 must be first (newest)');
        $this->assertEquals('Midday', $titles[1], 'Created at 10:00 must be second');
        $this->assertEquals('Morning', $titles[2], 'Created at 08:00 must be third');

        // Suppress unused variable warnings — IDs are not compared but we want to  ensure
        // the factory creates distinct events. Use them.
        $this->assertNotEquals($event1->id, $event2->id);
        $this->assertNotEquals($event2->id, $event3->id);
    }
}
