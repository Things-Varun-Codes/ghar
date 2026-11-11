<?php

namespace Tests\Feature\History;

use App\MiniApps\History\Models\Event;
use App\MiniApps\History\Models\EventChange;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HistoryActivityLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_create_writes_create_change_row(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        $this->actingAs($user)->post('/apps/our-history/events', [
            'occurred_on' => '2024-01-01',
            'title' => 'Test event',
        ]);

        $event = Event::first();

        $this->assertNotNull($event, 'Event should have been created');

        $this->assertDatabaseHas('our_history_event_changes', [
            'event_id' => $event->id,
            'user_id' => $user->id,
            'action' => 'create',
            'summary' => 'Event created',
        ]);
    }

    public function test_update_writes_edit_change_row_with_changed_fields_summary(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        /** @var Event $event */
        $event = Event::factory()->create([
            'title' => 'Original title',
            'creator_id' => $user->id,
        ]);

        // Clear any prior change rows from factory setup
        EventChange::where('event_id', $event->id)->delete();

        $this->actingAs($user)->patch("/apps/our-history/events/{$event->id}", [
            'occurred_on' => $event->occurred_on->toDateString(),
            'title' => 'Updated title',
        ]);

        $this->assertDatabaseHas('our_history_event_changes', [
            'event_id' => $event->id,
            'user_id' => $user->id,
            'action' => 'edit',
        ]);

        $changeRow = EventChange::where('event_id', $event->id)
            ->where('action', 'edit')
            ->first();

        $this->assertNotNull($changeRow);
        // occurred_on was resubmitted unchanged, so it must not be named.
        $this->assertSame('Updated title', $changeRow->summary);
        $this->assertSame(['title'], $changeRow->changes);
    }

    public function test_body_edit_is_logged_as_body(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        /** @var Event $event */
        $event = Event::factory()->create(['creator_id' => $user->id, 'body_html' => '<p>Before</p>']);

        $this->actingAs($user)->patch("/apps/our-history/events/{$event->id}", [
            'body_html' => '<p>After</p>',
        ])->assertSessionHasNoErrors();

        $this->assertSame(
            'Updated body',
            EventChange::where('event_id', $event->id)->where('action', 'edit')->sole()->summary,
        );
    }

    public function test_noop_patch_logs_nothing(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        /** @var Event $event */
        $event = Event::factory()->create([
            'title' => 'Same title',
            'body_html' => '<p>Same body</p>',
            'location_lat' => '12.9715987',
            'location_lng' => '77.5945627',
            'creator_id' => $user->id,
        ]);

        $this->actingAs($user)->patch("/apps/our-history/events/{$event->id}", [
            'occurred_on' => $event->occurred_on->toDateString(),
            'title' => 'Same title',
            'body_html' => '<p>Same body</p>',
            'location_lat' => 12.9715987,
            'location_lng' => 77.5945627,
        ])->assertSessionHasNoErrors();

        $this->assertSame(0, EventChange::where('event_id', $event->id)->where('action', 'edit')->count());
    }

    public function test_delete_writes_delete_change_row_then_soft_deletes(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        /** @var Event $event */
        $event = Event::factory()->create(['creator_id' => $user->id]);

        $this->actingAs($user)->delete("/apps/our-history/events/{$event->id}");

        // The delete log entry must exist
        $this->assertDatabaseHas('our_history_event_changes', [
            'event_id' => $event->id,
            'user_id' => $user->id,
            'action' => 'delete',
            'summary' => 'Event deleted',
        ]);

        // The event itself must be soft-deleted (not hard-deleted)
        $this->assertSoftDeleted('our_history_events', ['id' => $event->id]);
    }

    public function test_change_rows_survive_event_soft_delete(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        /** @var Event $event */
        $event = Event::factory()->create(['creator_id' => $user->id]);
        $eventId = $event->id;

        // Create a change row
        $this->actingAs($user)->post('/apps/our-history/events', [
            'occurred_on' => '2024-03-01',
        ]);

        // Now soft-delete the event
        $this->actingAs($user)->delete("/apps/our-history/events/{$event->id}");

        // Event is soft-deleted
        $this->assertSoftDeleted('our_history_events', ['id' => $event->id]);

        // But all change rows for it still exist
        $changeCount = EventChange::where('event_id', $event->id)->count();
        $this->assertGreaterThan(0, $changeCount, 'Activity log must survive event soft-delete');
    }
}
