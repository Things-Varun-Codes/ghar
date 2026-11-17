<?php

namespace Tests\Feature\Corner;

use App\MiniApps\History\Models\Event;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia;
use Tests\Feature\Corner\Concerns\MakesCornerLists;
use Tests\TestCase;

class CornerMentionedInTest extends TestCase
{
    use MakesCornerLists;
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    private function recordRef(int $fromId, string $toType, int $toId): void
    {
        // Inserted directly so this doesn't depend on History's save path (that's
        // HistoryCornerLinkRefTest).
        DB::table('entity_references')->insert([
            'from_type' => 'history.event',
            'from_id' => $fromId,
            'to_type' => $toType,
            'to_id' => $toId,
            'created_at' => now(),
        ]);
    }

    public function test_an_item_lists_the_moments_that_mention_it(): void
    {
        $list = $this->activities();
        $item = $this->itemIn($list, $this->user);
        $event = Event::factory()->create(['creator_id' => $this->user->id, 'title' => 'Our Sydney trip']);

        $this->recordRef($event->id, 'corner.item', $item->id);

        $this->actingAs($this->user)
            ->get("/apps/our-corner/{$list->slug}/{$item->id}")
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('MiniApps/Corner/Pages/Item')
                ->has('mentioned_in', 1)
                ->where('mentioned_in.0.from_type', 'history.event')
                ->where('mentioned_in.0.from_id', $event->id)
                ->where('mentioned_in.0.snapshot.title', 'Our Sydney trip')
                ->where('mentioned_in.0.snapshot.deep_link_url', '/apps/our-history?moment='.$event->id));
    }

    public function test_a_moved_item_also_lists_moments_that_link_its_old_id_once_each(): void
    {
        $list = $this->songs();
        $song = $this->itemIn($list, $this->user, ['legacy_type' => 'corner.song', 'legacy_id' => 3]);
        $old = Event::factory()->create(['creator_id' => $this->user->id, 'title' => 'Old link']);
        $new = Event::factory()->create(['creator_id' => $this->user->id, 'title' => 'New link']);
        $both = Event::factory()->create(['creator_id' => $this->user->id, 'title' => 'Both']);

        $this->recordRef($old->id, 'corner.song', 3);
        $this->recordRef($new->id, 'corner.item', $song->id);
        $this->recordRef($both->id, 'corner.song', 3);
        $this->recordRef($both->id, 'corner.item', $song->id);
        // Same old id, another old type: a different item.
        $this->recordRef(Event::factory()->create(['creator_id' => $this->user->id])->id, 'corner.movie', 3);
        // The new id under an old type names some other old song.
        $this->recordRef(Event::factory()->create(['creator_id' => $this->user->id])->id, 'corner.song', $song->id);

        foreach ([3, $song->id] as $id) {
            $this->actingAs($this->user)
                ->get("/apps/our-corner/songs/{$id}")
                ->assertInertia(fn (AssertableInertia $page) => $page
                    ->where('item.id', $song->id)
                    ->has('mentioned_in', 3)
                    ->where('mentioned_in', fn ($mentions) => collect($mentions)->pluck('from_id')->sort()->values()->all()
                        === collect([$old->id, $new->id, $both->id])->sort()->values()->all()));
        }
    }

    public function test_a_mention_from_a_deleted_moment_has_no_snapshot(): void
    {
        $list = $this->activities();
        $item = $this->itemIn($list, $this->user);

        $this->recordRef(999999, 'corner.item', $item->id);

        $this->actingAs($this->user)
            ->get("/apps/our-corner/{$list->slug}/{$item->id}")
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->has('mentioned_in', 1)
                ->where('mentioned_in.0.from_type', 'history.event')
                ->where('mentioned_in.0.snapshot', null));
    }

    public function test_an_unmentioned_item_has_none(): void
    {
        $list = $this->activities();
        $item = $this->itemIn($list, $this->user);

        $this->actingAs($this->user)
            ->get("/apps/our-corner/{$list->slug}/{$item->id}")
            ->assertInertia(fn (AssertableInertia $page) => $page->has('mentioned_in', 0));
    }

    public function test_one_moment_mentioning_two_items_shows_on_both(): void
    {
        $list = $this->activities();
        $a = $this->itemIn($list, $this->user);
        $b = $this->itemIn($list, $this->user);
        $event = Event::factory()->create(['creator_id' => $this->user->id]);

        $this->recordRef($event->id, 'corner.item', $a->id);
        $this->recordRef($event->id, 'corner.item', $b->id);

        foreach ([$a, $b] as $item) {
            $this->actingAs($this->user)
                ->get("/apps/our-corner/{$list->slug}/{$item->id}")
                ->assertInertia(fn (AssertableInertia $page) => $page
                    ->has('mentioned_in', 1)
                    ->where('mentioned_in.0.from_id', $event->id));
        }
    }
}
