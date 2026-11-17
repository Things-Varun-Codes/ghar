<?php

namespace Tests\Feature\History;

use App\MiniApps\History\Models\Event;
use App\Shell\Models\User;
use App\Shell\Services\LinkableEntities;
use App\Shell\Services\Rooms;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia;
use Tests\Feature\Corner\Concerns\MakesCornerLists;
use Tests\TestCase;

/** A link in a moment shows the thing as it is now, not as it was when the link was written. */
class LinkedThingsTest extends TestCase
{
    use MakesCornerLists;
    use RefreshDatabase;

    private function momentLinkingTo(User $creator, array $refs): Event
    {
        $event = Event::factory()->create(['creator_id' => $creator->id, 'occurred_on' => now()->toDateString()]);

        foreach ($refs as [$type, $id]) {
            app(LinkableEntities::class)->recordReference('history.event', $event->id, $type, $id);
        }

        return $event;
    }

    public function test_the_timeline_carries_each_linked_things_current_picture_and_icon(): void
    {
        $user = User::factory()->create();
        $songs = $this->songs();
        $old = $this->itemIn($songs, $user, ['legacy_type' => 'corner.song', 'legacy_id' => 5, 'image_url' => 'https://images.example.com/now.jpg']);
        $new = $this->itemIn($songs, $user, ['image_url' => null]);
        $event = $this->momentLinkingTo($user, [['corner.song', 5], ['corner.item', $new->id]]);

        $this->actingAs($user)->get('/apps/our-history')->assertOk()->assertInertia(fn (AssertableInertia $page) => $page
            ->where('events.data.0.id', $event->id)
            ->where('events.data.0.links', fn ($links) => $links['corner.song:5']['thumbnail_url'] === $old->pictureUrl()
                && $links['corner.song:5']['icon'] === 'music'
                && $links["corner.item:{$new->id}"]['thumbnail_url'] === null)
        );
    }

    public function test_a_changed_or_removed_picture_is_followed(): void
    {
        $user = User::factory()->create();
        $item = $this->itemIn($this->songs(), $user, ['image_url' => 'https://images.example.com/a.jpg']);
        $event = $this->momentLinkingTo($user, [['corner.item', $item->id]]);
        $before = $item->pictureUrl();

        $item->update(['image_url' => 'https://images.example.com/b.jpg']);
        $this->actingAs($user)->get('/apps/our-history')->assertInertia(fn (AssertableInertia $page) => $page
            ->where('events.data.0.links', fn ($links) => ! in_array($links["corner.item:{$item->id}"]['thumbnail_url'], [null, $before], true)));

        $item->update(['image_url' => null]);
        $this->get('/apps/our-history')->assertInertia(fn (AssertableInertia $page) => $page
            ->where('events.data.0.links', fn ($links) => $links["corner.item:{$item->id}"]['thumbnail_url'] === null));
    }

    public function test_a_deleted_thing_or_an_off_room_leaves_the_link_as_written(): void
    {
        $user = User::factory()->create();
        $songs = $this->songs();
        $item = $this->itemIn($songs, $user);
        $gone = $this->itemIn($songs, $user);
        $this->momentLinkingTo($user, [['corner.item', $item->id], ['corner.item', $gone->id]]);
        $gone->delete();

        $this->actingAs($user)->get('/apps/our-history')->assertInertia(fn (AssertableInertia $page) => $page
            ->where('events.data.0.links', fn ($links) => isset($links["corner.item:{$item->id}"])
                && ! isset($links["corner.item:{$gone->id}"])));

        app(Rooms::class)->set('our-corner', false);

        $this->get('/apps/our-history')->assertInertia(fn (AssertableInertia $page) => $page
            ->where('events.data.0.links', []));
    }

    public function test_the_lookup_costs_the_same_however_many_moments_link(): void
    {
        $user = User::factory()->create();
        $songs = $this->songs();
        $count = function () use ($user): int {
            DB::flushQueryLog();
            DB::enableQueryLog();
            $this->actingAs($user)->get('/apps/our-history')->assertOk();

            return count(DB::getQueryLog());
        };

        $this->momentLinkingTo($user, [['corner.item', $this->itemIn($songs, $user)->id]]);
        $few = $count();

        for ($i = 0; $i < 6; $i++) {
            $legacy = $this->itemIn($songs, $user, ['legacy_type' => 'corner.song', 'legacy_id' => 100 + $i]);
            $this->momentLinkingTo($user, [
                ['corner.item', $this->itemIn($songs, $user)->id],
                ['corner.song', (int) $legacy->legacy_id],
            ]);
        }

        // One more type (the old corner.song) costs one more query, whatever the number of links.
        $this->assertLessThanOrEqual($few + 1, $count());
    }
}
