<?php

namespace Tests\Feature\Corner;

use App\MiniApps\Corner\Models\Song;
use App\MiniApps\History\Models\Event;
use App\Shell\Models\User;
use App\Shell\Services\LinkableEntities;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CornerMentionedInTest extends TestCase
{
    use RefreshDatabase;

    private function recordRef(string $fromType, int $fromId, string $toType, int $toId): void
    {
        // Direct DB insert so the test does not depend on the diff-on-save  path (covered by
        // HistoryCornerLinkRefTest). entity_references is a  shell table populated by
        // LinkableEntities::recordReference.
        DB::table('entity_references')->insert([
            'from_type' => $fromType,
            'from_id' => $fromId,
            'to_type' => $toType,
            'to_id' => $toId,
            'created_at' => now(),
        ]);
    }

    public function test_shows_mentioned_in_for_referenced_song(): void
    {
        $user = User::factory()->create();
        $song = Song::factory()->create();
        $event = Event::factory()->create([
            'creator_id' => $user->id,
            'title' => 'Our Sydney trip',
        ]);

        $this->recordRef('history.event', $event->id, 'corner.song', $song->id);

        $response = $this->actingAs($user)
            ->get('/apps/our-corner/songs/'.$song->id);

        $response->assertStatus(200);
        $response->assertInertia(
            fn ($page) => $page
                ->component('MiniApps/Corner/Pages/Songs/Show')
                ->has('mentioned_in', 1)
                ->where('mentioned_in.0.from_type', 'history.event')
                ->where('mentioned_in.0.from_id', $event->id)
                ->where('mentioned_in.0.snapshot.title', 'Our Sydney trip')
                ->where('mentioned_in.0.snapshot.deep_link_url',
                    '/apps/our-history#event-'.$event->id),
        );
    }

    public function test_missing_from_entity(): void
    {
        $user = User::factory()->create();
        $song = Song::factory()->create();

        $this->recordRef('history.event', 99999, 'corner.song', $song->id);

        $response = $this->actingAs($user)
            ->get('/apps/our-corner/songs/'.$song->id);

        $response->assertStatus(200);
        $response->assertInertia(
            fn ($page) => $page
                ->has('mentioned_in', 1)
                ->where('mentioned_in.0.from_type', 'history.event')
                ->where('mentioned_in.0.snapshot', null),
        );
    }

    public function test_empty_mentioned_in_renders_empty_state(): void
    {
        $user = User::factory()->create();
        $song = Song::factory()->create();

        $response = $this->actingAs($user)
            ->get('/apps/our-corner/songs/'.$song->id);

        $response->assertStatus(200);
        $response->assertInertia(
            fn ($page) => $page
                ->has('mentioned_in', 0),
        );
    }

    public function test_history_event_referenced_by_two_songs(): void
    {
        $user = User::factory()->create();
        $songA = Song::factory()->create();
        $songB = Song::factory()->create();
        $event = Event::factory()->create([
            'creator_id' => $user->id,
        ]);

        $this->recordRef('history.event', $event->id, 'corner.song', $songA->id);
        $this->recordRef('history.event', $event->id, 'corner.song', $songB->id);

        $a = $this->actingAs($user)
            ->get('/apps/our-corner/songs/'.$songA->id);
        $b = $this->actingAs($user)
            ->get('/apps/our-corner/songs/'.$songB->id);

        $a->assertInertia(
            fn ($page) => $page
                ->has('mentioned_in', 1)
                ->where('mentioned_in.0.from_id', $event->id),
        );
        $b->assertInertia(
            fn ($page) => $page
                ->has('mentioned_in', 1)
                ->where('mentioned_in.0.from_id', $event->id),
        );

        // Sanity: the LinkableEntities service is the one wiring this.
        $this->assertGreaterThanOrEqual(
            5,
            count(app(LinkableEntities::class)->registeredTypes()),
        );
    }
}
