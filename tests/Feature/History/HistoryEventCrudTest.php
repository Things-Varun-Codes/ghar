<?php

namespace Tests\Feature\History;

use App\MiniApps\History\Models\Event;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HistoryEventCrudTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_create_event_with_all_fields(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        // A typed-in location: what the form sends when there's no Google Maps key.
        $response = $this->actingAs($user)->post('/apps/our-history/events', [
            'occurred_on' => '2024-02-14',
            'title' => 'First date',
            'location_freetext' => 'Lisbon',
            'body_html' => '<h2>Hello</h2><p>This is our <em>first</em> date.</p>',
        ]);

        $response->assertRedirect('/apps/our-history');

        $this->assertDatabaseHas('our_history_events', [
            'title' => 'First date',
            'location_freetext' => 'Lisbon',
            'creator_id' => $user->id,
        ]);

        // body_html must persist (sanitized) when body_html provided in the payload.
        $event = Event::first();
        $this->assertNotNull($event->body_html);
    }

    public function test_user_can_create_event_with_only_date(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        $this->actingAs($user)->post('/apps/our-history/events', [
            'occurred_on' => '2024-06-01',
        ])->assertRedirect('/apps/our-history');

        $this->assertDatabaseHas('our_history_events', [
            'creator_id' => $user->id,
        ]);
    }

    public function test_create_validation_requires_date(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/apps/our-history/events', [
            'title' => 'No date event',
        ]);

        $response->assertSessionHasErrors('occurred_on');
    }

    public function test_unauthenticated_user_cannot_create_event(): void
    {
        $this->post('/apps/our-history/events', [
            'occurred_on' => '2024-01-01',
        ])->assertRedirect('/login');
    }

    public function test_update_validation_requires_date(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        /** @var Event $event */
        $event = Event::factory()->create(['creator_id' => $user->id]);

        $this->actingAs($user)
            ->patch("/apps/our-history/events/{$event->id}", [
                'occurred_on' => '',
                'title' => 'Whatever',
            ])
            ->assertSessionHasErrors('occurred_on');
    }

    public function test_update_validation_rejects_oversized_body(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        /** @var Event $event */
        $event = Event::factory()->create(['creator_id' => $user->id]);

        $this->actingAs($user)
            ->patch("/apps/our-history/events/{$event->id}", [
                'occurred_on' => $event->occurred_on->toDateString(),
                'body_html' => str_repeat('a', 50001),
            ])
            ->assertSessionHasErrors('body_html');
    }

    public function test_unauthenticated_user_cannot_update_event(): void
    {
        /** @var Event $event */
        $event = Event::factory()->create();

        $this->patch("/apps/our-history/events/{$event->id}", [
            'occurred_on' => '2024-01-01',
        ])->assertRedirect('/login');
    }

    public function test_body_html_round_trip(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        $html = '<p>hello <strong>world</strong></p>';

        $this->actingAs($user)->post('/apps/our-history/events', [
            'occurred_on' => '2024-01-01',
            'body_html' => $html,
        ])->assertRedirect('/apps/our-history');

        $event = Event::first();
        $this->assertNotNull($event, 'Event should have been created');
        $this->assertSame(
            $html,
            $event->body_html,
            'body_html must round-trip lossless through the SanitizeBodyHtml allowlist.',
        );
    }

    public function test_body_html_validation(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        // (1) Oversized body_html (> 50_000 chars) MUST fail validation.
        $this->actingAs($user)->post('/apps/our-history/events', [
            'occurred_on' => '2024-01-01',
            'body_html' => str_repeat('a', 50_001),
        ])->assertSessionHasErrors('body_html');

        // (2) Missing body_html is allowed — the field is optional.
        $this->actingAs($user)->post('/apps/our-history/events', [
            'occurred_on' => '2024-02-01',
        ])->assertRedirect('/apps/our-history');

        // (3) <script> in body_html must be stripped by the sanitizer before persist.
        $this->actingAs($user)->post('/apps/our-history/events', [
            'occurred_on' => '2024-03-01',
            'body_html' => '<p>hi</p><script>alert(1)</script>',
        ])->assertRedirect('/apps/our-history');

        $event = Event::query()->latest('id')->first();
        $this->assertNotNull($event);
        $this->assertStringNotContainsString(
            '<script',
            (string) $event->body_html,
            'Sanitizer MUST strip <script> tags before the event is persisted.',
        );
    }

    public function test_structured_location_validation(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        // Happy path — full structured payload from PlaceAutocompleteElement.
        $payload = [
            'occurred_on' => '2024-01-01',
            'location_place_id' => 'ChIJN1t_tDeuEmsRUsoyG83frY4',
            'location_name' => 'Sydney Opera House',
            'location_address' => 'Bennelong Point, Sydney NSW 2000',
            'location_lat' => -33.8568,
            'location_lng' => 151.2153,
        ];

        $this->actingAs($user)
            ->post('/apps/our-history/events', $payload)
            ->assertRedirect('/apps/our-history');

        $this->assertDatabaseHas('our_history_events', [
            'creator_id' => $user->id,
            'location_place_id' => 'ChIJN1t_tDeuEmsRUsoyG83frY4',
            'location_name' => 'Sydney Opera House',
            'location_address' => 'Bennelong Point, Sydney NSW 2000',
        ]);

        // location_lat must be numeric.
        $this->actingAs($user)->post('/apps/our-history/events', array_merge($payload, [
            'occurred_on' => '2024-02-01',
            'location_lat' => 'not-a-number',
        ]))->assertSessionHasErrors('location_lat');

        // location_place_id must be <= 255 chars.
        $this->actingAs($user)->post('/apps/our-history/events', array_merge($payload, [
            'occurred_on' => '2024-03-01',
            'location_place_id' => str_repeat('x', 256),
        ]))->assertSessionHasErrors('location_place_id');
    }

    public function test_legacy_location_freetext_renders(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        // Simulate a backfilled legacy row: all five structured columns null,
        // location_freetext populated. Display as-is, no upgrade prompt.
        $event = Event::factory()->create([
            'creator_id' => $user->id,
            'location_freetext' => 'Lisbon',
            'location_place_id' => null,
            'location_name' => null,
            'location_address' => null,
            'location_lat' => null,
            'location_lng' => null,
        ]);

        $response = $this->actingAs($user)
            ->get('/apps/our-history')
            ->assertStatus(200);

        $events = $response->inertiaProps('events.data');
        $this->assertNotEmpty($events, 'Timeline must surface the backfilled legacy event.');

        $row = collect($events)->firstWhere('id', $event->id);
        $this->assertNotNull($row, 'Backfilled event must appear in the timeline payload.');
        $this->assertSame(
            'Lisbon',
            $row['location_freetext'] ?? null,
            'Timeline JSON must expose location_freetext for legacy events.',
        );
    }

    public function test_events_index_uses_cursor_keyset_with_id_tiebreaker(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        // Identical occurred_on AND created_at so ONLY the id tiebreaker orders them.
        $ts = now()->setMicroseconds(0);
        $e1 = Event::factory()->create(['creator_id' => $user->id, 'occurred_on' => '2025-01-01', 'created_at' => $ts]);
        $e2 = Event::factory()->create(['creator_id' => $user->id, 'occurred_on' => '2025-01-01', 'created_at' => $ts]);
        $e3 = Event::factory()->create(['creator_id' => $user->id, 'occurred_on' => '2025-01-01', 'created_at' => $ts]);

        $this->actingAs($user)
            ->get('/apps/our-history')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('events.data', 3)
                // Default newest-first: occurred_on DESC, created_at DESC, id DESC.
                ->where('events.data.0.id', $e3->id)
                ->where('events.data.1.id', $e2->id)
                ->where('events.data.2.id', $e1->id)
                // cursorPaginate() omits offset meta (a LengthAwarePaginator would expose
                // these).
                ->missing('events.total')
                ->missing('events.last_page')
                ->missing('events.current_page'));
    }
}
