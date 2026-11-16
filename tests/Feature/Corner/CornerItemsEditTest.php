<?php

namespace Tests\Feature\Corner;

use App\MiniApps\Corner\Models\Item;
use App\MiniApps\Corner\Support\ItemDetails;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Tests\Feature\Corner\Concerns\MakesCornerLists;
use Tests\TestCase;

class CornerItemsEditTest extends TestCase
{
    use MakesCornerLists;
    use RefreshDatabase;

    private const YOUTUBE = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

    private User $adder;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();

        $this->adder = User::factory()->create();
        User::factory()->create();
    }

    private function fakeYouTube(): void
    {
        Http::fake([
            'youtube.com/oembed*' => Http::response([
                'title' => 'Test Track',
                'author_name' => 'Test Artist',
                'thumbnail_url' => 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
            ], 200),
        ]);
    }

    public function test_a_new_link_is_looked_up_again_and_the_edit_is_silent(): void
    {
        $this->fakeYouTube();
        $song = $this->itemIn($this->songs(), $this->adder, [
            'provider_id' => 'oldVideoId1',
            'url' => 'https://www.youtube.com/watch?v=oldVideoId1',
            'title' => 'Old Title',
            'author' => 'Old Artist',
        ]);

        $this->actingAs($this->adder)
            ->from("/apps/our-corner/songs/{$song->id}")
            ->patch("/apps/our-corner/items/{$song->id}", ['url' => self::YOUTUBE])
            ->assertRedirect("/apps/our-corner/songs/{$song->id}");

        $this->assertDatabaseHas('corner_items', [
            'id' => $song->id,
            'provider' => 'youtube',
            'provider_id' => 'dQw4w9WgXcQ',
            'title' => 'Test Track',
            'author' => 'Test Artist',
            'image_url' => 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
            'url' => self::YOUTUBE,
        ]);

        Notification::assertNothingSent();
    }

    public function test_keeping_the_link_keeps_what_was_looked_up_without_asking_again(): void
    {
        Http::fake();
        $song = $this->itemIn($this->songs(), $this->adder, ['title' => 'Old Title', 'author' => 'Old Artist']);
        $image = $song->image_url;

        $this->actingAs($this->adder)
            ->patch("/apps/our-corner/items/{$song->id}", ['url' => $song->url, 'title' => 'Renamed', 'notes' => 'Our wedding song'])
            ->assertSessionHasNoErrors();

        $song->refresh();
        $this->assertSame('Renamed', $song->title);
        $this->assertSame('Our wedding song', $song->notes);
        $this->assertSame('Old Artist', $song->author);
        $this->assertSame($image, $song->image_url);
        Http::assertNothingSent();

        // A blank title on the same link keeps the title it had.
        $this->actingAs($this->adder)
            ->patch("/apps/our-corner/items/{$song->id}", ['url' => $song->url, 'title' => ''])
            ->assertSessionHasNoErrors();

        $this->assertSame('Renamed', $song->fresh()->title);
    }

    public function test_a_link_edit_needs_a_link(): void
    {
        $song = $this->itemIn($this->songs(), $this->adder);

        $this->actingAs($this->adder)
            ->from('/apps/our-corner/songs')
            ->patch("/apps/our-corner/items/{$song->id}", ['url' => ''])
            ->assertSessionHasErrors(['url']);
    }

    public function test_moving_a_link_onto_one_already_in_the_list_is_a_field_error_and_changes_nothing(): void
    {
        $this->fakeYouTube();
        $list = $this->songs();
        $this->itemIn($list, $this->adder, ['provider' => 'youtube', 'provider_id' => 'dQw4w9WgXcQ', 'url' => self::YOUTUBE]);
        $b = $this->itemIn($list, $this->adder, [
            'provider' => 'youtube',
            'provider_id' => 'bbbbbbbbbbb',
            'url' => 'https://www.youtube.com/watch?v=bbbbbbbbbbb',
            'title' => 'B',
        ]);

        $this->actingAs($this->adder)
            ->from('/apps/our-corner/songs')
            ->patch("/apps/our-corner/items/{$b->id}", ['url' => self::YOUTUBE])
            ->assertSessionHasErrors(['url' => ItemDetails::DUPLICATE_LINK]);

        $b->refresh();
        $this->assertSame('bbbbbbbbbbb', $b->provider_id);
        $this->assertSame('B', $b->title);
    }

    public function test_a_poster_edit_looks_the_new_plex_link_up(): void
    {
        Http::fake([
            'watch.plex.tv/*' => Http::response(
                '<html><head>'
                .'<meta property="og:title" content="Edited Movie">'
                .'<meta property="og:image" content="https://images.plex.tv/photo?url=edited">'
                .'</head></html>',
                200,
            ),
        ]);
        $movie = $this->itemIn($this->movies(), $this->adder, ['title' => 'Old Title', 'url' => null, 'image_url' => null]);

        $this->actingAs($this->adder)
            ->patch("/apps/our-corner/items/{$movie->id}", ['title' => 'New Title', 'url' => 'https://watch.plex.tv/movie/y'])
            ->assertRedirect();

        $this->assertDatabaseHas('corner_items', [
            'id' => $movie->id,
            'title' => 'New Title',
            'url' => 'https://watch.plex.tv/movie/y',
            'image_url' => 'https://images.plex.tv/photo?url=edited',
        ]);
        Notification::assertNothingSent();

        // Taking the link away takes the poster with it.
        $this->actingAs($this->adder)
            ->patch("/apps/our-corner/items/{$movie->id}", ['title' => 'New Title', 'url' => ''])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('corner_items', ['id' => $movie->id, 'url' => null, 'image_url' => null]);
    }

    public function test_a_poster_edit_rejects_a_link_that_is_not_plex(): void
    {
        $movie = $this->itemIn($this->movies(), $this->adder);

        $this->actingAs($this->adder)
            ->from('/apps/our-corner/movies')
            ->patch("/apps/our-corner/items/{$movie->id}", ['title' => 'X', 'url' => 'https://evil.com/x'])
            ->assertSessionHasErrors(['url']);
    }

    public function test_a_plain_item_edit_changes_title_and_notes(): void
    {
        $activity = $this->itemIn($this->activities(), $this->adder, ['title' => 'Old title', 'notes' => 'old notes']);

        $this->actingAs($this->adder)
            ->patch("/apps/our-corner/items/{$activity->id}", ['title' => 'New title', 'notes' => 'new notes'])
            ->assertRedirect();

        $this->assertDatabaseHas('corner_items', ['id' => $activity->id, 'title' => 'New title', 'notes' => 'new notes']);
        Notification::assertNothingSent();

        $this->actingAs($this->adder)
            ->from('/apps/our-corner/activities')
            ->patch("/apps/our-corner/items/{$activity->id}", ['title' => ''])
            ->assertSessionHasErrors(['title']);
    }

    public function test_a_place_edit_replaces_its_details(): void
    {
        $place = $this->itemIn($this->places(), $this->adder, ['title' => 'Old Cafe']);

        $this->actingAs($this->adder)
            ->patch("/apps/our-corner/items/{$place->id}", [
                'title' => 'New Cafe',
                'place_id' => 'ChIJnewplaceid',
                'lat' => 40.7484,
                'lng' => -73.9857,
                'address' => '20 W 34th St, New York, NY 10001',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('corner_items', [
            'id' => $place->id,
            'title' => 'New Cafe',
            'place_id' => 'ChIJnewplaceid',
            'lat' => '40.7484000',
            'lng' => '-73.9857000',
            'address' => '20 W 34th St, New York, NY 10001',
        ]);
        Notification::assertNothingSent();
    }

    public function test_an_edit_never_moves_an_item_to_another_list_or_rewrites_who_added_it(): void
    {
        $list = $this->activities();
        $other = $this->movies();
        $item = $this->itemIn($list, $this->adder);

        $this->actingAs($this->adder)
            ->patch("/apps/our-corner/items/{$item->id}", [
                'title' => 'Still here',
                'list_id' => $other->id,
                'added_by_user_id' => User::factory()->create()->id,
            ])
            ->assertSessionHasNoErrors();

        $item->refresh();
        $this->assertSame($list->id, $item->list_id);
        $this->assertSame($this->adder->id, $item->added_by_user_id);
    }

    public function test_editing_an_item_that_does_not_exist_is_a_404(): void
    {
        $this->actingAs($this->adder)
            ->patch('/apps/our-corner/items/'.(Item::max('id') + 1000), ['title' => 'X'])
            ->assertNotFound();
    }
}
