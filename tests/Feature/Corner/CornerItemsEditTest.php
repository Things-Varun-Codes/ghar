<?php

namespace Tests\Feature\Corner;

use App\MiniApps\Corner\Models\Item;
use App\MiniApps\Corner\Support\ItemDetails;
use App\MiniApps\Corner\Support\LinkKey;
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

    private User $adder;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        $this->publicDns();

        $this->adder = User::factory()->create();
        User::factory()->create();
    }

    private const SONG = 'https://music.example.com/watch?v=new';

    private function fakeSongPage(): void
    {
        Http::fake([
            'music.example.com/*' => Http::response(
                '<html><head><meta property="og:title" content="Test Track">'
                .'<meta property="og:image" content="https://music.example.com/new.jpg">'
                .'<meta name="author" content="Test Artist"></head></html>',
                200,
                ['Content-Type' => 'text/html'],
            ),
        ]);
    }

    public function test_a_new_link_is_looked_up_again_and_the_edit_is_silent(): void
    {
        $this->fakeSongPage();
        $song = $this->itemIn($this->songs(), $this->adder, [
            'url' => 'https://music.example.com/watch?v=old',
            'title' => 'Old Title',
            'author' => 'Old Artist',
        ]);

        $this->actingAs($this->adder)
            ->from("/apps/our-corner/songs/{$song->id}")
            ->patch("/apps/our-corner/items/{$song->id}", ['url' => self::SONG])
            ->assertRedirect("/apps/our-corner/songs/{$song->id}");

        $this->assertDatabaseHas('corner_items', [
            'id' => $song->id,
            'url' => self::SONG,
            'url_key' => LinkKey::for(self::SONG),
            'title' => 'Test Track',
            'author' => 'Test Artist',
            'site_name' => 'music.example.com',
            'image_url' => 'https://music.example.com/new.jpg',
        ]);

        Notification::assertNothingSent();
    }

    public function test_keeping_the_link_keeps_what_was_looked_up_without_asking_again(): void
    {
        Http::fake();
        $song = $this->itemIn($this->songs(), $this->adder, ['title' => 'Old Title', 'author' => 'Old Artist']);
        $image = $song->image_url;
        $site = $song->site_name;

        $this->actingAs($this->adder)
            ->patch("/apps/our-corner/items/{$song->id}", ['url' => $song->url, 'title' => 'Renamed', 'notes' => 'Our wedding song', 'image_url' => $image])
            ->assertSessionHasNoErrors();

        $song->refresh();
        $this->assertSame('Renamed', $song->title);
        $this->assertSame('Our wedding song', $song->notes);
        $this->assertSame('Old Artist', $song->author);
        $this->assertSame($site, $song->site_name);
        $this->assertSame($image, $song->image_url);
        Http::assertNothingSent();

        // A blank title on the same link keeps the title it had, and the picture it had.
        $this->actingAs($this->adder)
            ->patch("/apps/our-corner/items/{$song->id}", ['url' => $song->url, 'title' => ''])
            ->assertSessionHasNoErrors();

        $this->assertSame('Renamed', $song->fresh()->title);
        $this->assertSame($image, $song->fresh()->image_url);

        // Taking the picture away on purpose sticks.
        $this->actingAs($this->adder)
            ->patch("/apps/our-corner/items/{$song->id}", ['url' => $song->url, 'title' => 'Renamed', 'no_picture' => true])
            ->assertSessionHasNoErrors();

        $this->assertNull($song->fresh()->image_url);
        Http::assertNothingSent();
    }

    public function test_taking_the_link_away_needs_a_name_and_clears_what_the_link_gave(): void
    {
        $song = $this->itemIn($this->songs(), $this->adder);

        $this->actingAs($this->adder)
            ->from('/apps/our-corner/songs')
            ->patch("/apps/our-corner/items/{$song->id}", ['url' => '', 'title' => ''])
            ->assertSessionHasErrors(['title']);

        $this->actingAs($this->adder)
            ->patch("/apps/our-corner/items/{$song->id}", ['url' => '', 'title' => 'Just a name'])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('corner_items', [
            'id' => $song->id, 'title' => 'Just a name', 'url' => null, 'url_key' => null,
            'author' => null, 'site_name' => null, 'image_url' => null,
        ]);
    }

    public function test_moving_a_link_onto_one_already_in_the_list_is_a_field_error_and_changes_nothing(): void
    {
        $this->fakeSongPage();
        $list = $this->songs();
        $this->itemIn($list, $this->adder, ['url' => self::SONG, 'url_key' => LinkKey::for(self::SONG)]);
        $b = $this->itemIn($list, $this->adder, ['title' => 'B']);
        $bUrl = $b->url;

        $this->actingAs($this->adder)
            ->from('/apps/our-corner/songs')
            ->patch("/apps/our-corner/items/{$b->id}", ['url' => self::SONG.'&utm_source=x'])
            ->assertSessionHasErrors(['url' => ItemDetails::DUPLICATE_LINK]);

        $b->refresh();
        $this->assertSame($bUrl, $b->url);
        $this->assertSame('B', $b->title);
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
        Http::fake();
        $place = $this->itemIn($this->places(), $this->adder, ['title' => 'Old Cafe']);

        $this->actingAs($this->adder)
            ->patch("/apps/our-corner/items/{$place->id}", [
                'title' => 'New Cafe',
                'location' => 'geo:40.7484,-73.9857?q=Empire+State+Building',
                'address' => '20 W 34th St, New York, NY 10001',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('corner_items', [
            'id' => $place->id,
            'title' => 'New Cafe',
            'location_label' => 'Empire State Building',
            'location_url' => 'geo:40.7484,-73.9857?q=Empire+State+Building',
            'lat' => '40.7484000',
            'lng' => '-73.9857000',
            'address' => '20 W 34th St, New York, NY 10001',
        ]);
        Notification::assertNothingSent();

        // Clearing the place clears its coordinates.
        $this->actingAs($this->adder)
            ->patch("/apps/our-corner/items/{$place->id}", ['title' => 'New Cafe', 'location' => ''])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('corner_items', ['id' => $place->id, 'location_label' => null, 'lat' => null, 'lng' => null]);
    }

    public function test_an_upgraded_place_without_a_link_keeps_its_coordinates_when_edited(): void
    {
        Http::fake();
        // What the upgrade made of an old place: a name, a place id and coordinates, no map link.
        $place = Item::factory()->create([
            'list_id' => $this->places()->id,
            'added_by_user_id' => $this->adder->id,
            'title' => 'Lalbagh',
            'location_label' => 'Lalbagh',
            'place_id' => 'ChIJlalbagh',
            'lat' => 12.9507,
            'lng' => 77.5848,
            'legacy_type' => 'corner.place',
            'legacy_id' => 3,
        ]);

        $this->actingAs($this->adder)
            ->patch("/apps/our-corner/items/{$place->id}", ['title' => 'Lalbagh gardens', 'location' => 'Lalbagh', 'notes' => 'Go early'])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('corner_items', [
            'id' => $place->id,
            'title' => 'Lalbagh gardens',
            'location_label' => 'Lalbagh',
            'location_url' => null,
            'place_id' => 'ChIJlalbagh',
            'lat' => '12.9507000',
            'lng' => '77.5848000',
            'notes' => 'Go early',
        ]);
        Http::assertNothingSent();
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
