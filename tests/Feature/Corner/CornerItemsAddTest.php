<?php

namespace Tests\Feature\Corner;

use App\MiniApps\Corner\Actions\AddItem;
use App\MiniApps\Corner\Models\CornerList;
use App\MiniApps\Corner\Models\Item;
use App\MiniApps\Corner\Support\ItemDetails;
use App\MiniApps\Corner\Support\ListKind;
use App\Shell\Models\User;
use App\Shell\Notifications\GenericPushNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Inertia\Support\SessionKey;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Tests\Feature\Corner\Concerns\MakesCornerLists;
use Tests\TestCase;

class CornerItemsAddTest extends TestCase
{
    use MakesCornerLists;
    use RefreshDatabase;

    private const YOUTUBE = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

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

    /**
     * @return array<string, array{0: ListKind, 1: array<string, mixed>, 2: string}>
     */
    public static function kinds(): array
    {
        return [
            'link' => [ListKind::Link, ['url' => self::YOUTUBE], 'Test Track'],
            'poster' => [ListKind::Poster, ['title' => 'Inception'], 'Inception'],
            'plain' => [ListKind::Plain, ['title' => 'Beach trip'], 'Beach trip'],
            'place' => [ListKind::Place, [
                'title' => 'Sydney Opera House',
                'place_id' => 'ChIJ3S-JXmauEmsRUcIaWtf4MzE',
                'lat' => -33.8568,
                'lng' => 151.2153,
                'address' => 'Bennelong Point, Sydney NSW 2000',
            ], 'Sydney Opera House'],
        ];
    }

    /** @param  array<string, mixed>  $payload */
    #[DataProvider('kinds')]
    public function test_adding_an_item_toasts_redirects_to_the_bare_list_and_pushes_the_household(ListKind $kind, array $payload, string $title): void
    {
        Notification::fake();
        $this->fakeYouTube();

        $adder = User::factory()->create(['name' => 'Alice Smith']);
        $recipient = User::factory()->create(['name' => 'Bob Jones']);
        $list = $this->listOfKind($kind);

        $this->actingAs($adder)
            ->from("/apps/our-corner/{$list->slug}?q=zzz&filter=done")
            ->post("/apps/our-corner/{$list->slug}", $payload)
            ->assertRedirect("/apps/our-corner/{$list->slug}")
            ->assertSessionHas(SessionKey::FLASH_DATA, ['toast' => ['type' => 'success', 'message' => "Added to {$list->name}."]]);

        $item = Item::query()->sole();
        $this->assertSame($list->id, $item->list_id);
        $this->assertSame($title, $item->title);
        $this->assertSame($adder->id, $item->added_by_user_id);
        $this->assertNull($item->done_at);
        $this->assertNull($item->legacy_type);
        $this->assertNull($item->legacy_id);

        $itemUrl = "/apps/our-corner/{$list->slug}/{$item->id}";

        Notification::assertSentTo(
            $recipient,
            GenericPushNotification::class,
            function (GenericPushNotification $n) use ($recipient, $itemUrl, $list, $title) {
                $webPush = $n->toWebPush($recipient, $n)->toArray();

                return ($webPush['tag'] ?? null) === "our-corner:{$list->slug}"
                    && ($webPush['body'] ?? null) === "Alice added to {$list->name}: {$title}"
                    && ($webPush['data']['url'] ?? null) === $itemUrl;
            }
        );
        Notification::assertNotSentTo($adder, GenericPushNotification::class);
    }

    public function test_a_list_with_notifications_off_adds_silently(): void
    {
        Notification::fake();

        $adder = User::factory()->create();
        User::factory()->create();
        $list = CornerList::factory()->create(['notify_on_add' => false]);

        $this->actingAs($adder)
            ->post("/apps/our-corner/{$list->slug}", ['title' => 'Muted'])
            ->assertRedirect("/apps/our-corner/{$list->slug}");

        $this->assertDatabaseHas('corner_items', ['list_id' => $list->id, 'title' => 'Muted']);
        Notification::assertNothingSent();
    }

    public function test_the_push_waits_for_the_commit_and_a_rolled_back_add_sends_none(): void
    {
        Notification::fake();

        $adder = User::factory()->create();
        User::factory()->create();
        $list = $this->activities();

        try {
            DB::transaction(function () use ($list, $adder): void {
                app(AddItem::class)($list, ['title' => 'Never happened'], $adder);

                throw new RuntimeException('rolled back');
            });
        } catch (RuntimeException) {
        }

        $this->assertDatabaseMissing('corner_items', ['title' => 'Never happened']);
        Notification::assertNothingSent();

        app(AddItem::class)($list, ['title' => 'Happened'], $adder);
        Notification::assertSentTimes(GenericPushNotification::class, 1);
    }

    public function test_adding_to_a_list_that_does_not_exist_is_a_404(): void
    {
        $this->actingAs(User::factory()->create())
            ->post('/apps/our-corner/no-such-list', ['title' => 'X'])
            ->assertNotFound();

        $this->assertSame(0, Item::count());
    }

    public function test_any_notes_are_kept_and_blank_notes_become_null(): void
    {
        Notification::fake();
        $adder = User::factory()->create();
        $list = $this->activities();

        $this->actingAs($adder)->post("/apps/our-corner/{$list->slug}", [
            'title' => 'Hiking',
            'notes' => 'Bring water and snacks; start before sunrise.',
        ])->assertRedirect();

        $this->actingAs($adder)->post("/apps/our-corner/{$list->slug}", [
            'title' => 'Swimming',
            'notes' => '   ',
        ])->assertRedirect();

        $this->assertDatabaseHas('corner_items', ['title' => 'Hiking', 'notes' => 'Bring water and snacks; start before sunrise.']);
        $this->assertDatabaseHas('corner_items', ['title' => 'Swimming', 'notes' => null]);
    }

    public function test_notes_are_capped(): void
    {
        $list = $this->activities();

        $this->actingAs(User::factory()->create())
            ->from("/apps/our-corner/{$list->slug}")
            ->post("/apps/our-corner/{$list->slug}", ['title' => 'Long', 'notes' => str_repeat('a', 2001)])
            ->assertSessionHasErrors(['notes' => 'Notes are limited to 2000 characters.']);

        $this->assertSame(0, Item::count());
    }

    /** @return array<string, array{0: ListKind}> */
    public static function titledKinds(): array
    {
        return [
            'poster' => [ListKind::Poster],
            'plain' => [ListKind::Plain],
            'place' => [ListKind::Place],
        ];
    }

    #[DataProvider('titledKinds')]
    public function test_a_title_is_required_for_every_kind_but_links(ListKind $kind): void
    {
        $list = $this->listOfKind($kind);

        $this->actingAs(User::factory()->create())
            ->from("/apps/our-corner/{$list->slug}")
            ->post("/apps/our-corner/{$list->slug}", [])
            ->assertSessionHasErrors(['title']);

        $this->assertSame(0, Item::count());
    }

    // Links

    public function test_a_youtube_link_is_looked_up(): void
    {
        Notification::fake();
        $this->fakeYouTube();
        $adder = User::factory()->create();
        $list = $this->songs();

        $this->actingAs($adder)->post('/apps/our-corner/songs', ['url' => self::YOUTUBE])->assertRedirect('/apps/our-corner/songs');

        $this->assertDatabaseHas('corner_items', [
            'list_id' => $list->id,
            'url' => self::YOUTUBE,
            'provider' => 'youtube',
            'provider_id' => 'dQw4w9WgXcQ',
            'title' => 'Test Track',
            'author' => 'Test Artist',
            'image_url' => 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
            'added_by_user_id' => $adder->id,
        ]);
    }

    public function test_a_spotify_link_is_looked_up_without_an_author(): void
    {
        Notification::fake();
        Http::fake([
            'open.spotify.com/oembed*' => Http::response([
                'title' => 'Spotify Track - song by Spotify Artist',
                'thumbnail_url' => 'https://i.scdn.co/image/abc',
            ], 200),
        ]);
        $this->songs();

        $this->actingAs(User::factory()->create())
            ->post('/apps/our-corner/songs', ['url' => 'https://open.spotify.com/track/3z8h0TU7ReDPLIbEnYhWZb'])
            ->assertRedirect('/apps/our-corner/songs');

        $this->assertDatabaseHas('corner_items', [
            'provider' => 'spotify',
            'provider_id' => '3z8h0TU7ReDPLIbEnYhWZb',
            'author' => null,
            'image_url' => 'https://i.scdn.co/image/abc',
        ]);

        Http::assertSent(fn ($req) => str_starts_with($req->url(), 'https://open.spotify.com/oembed?'));
    }

    public function test_a_typed_title_wins_over_the_looked_up_one(): void
    {
        Notification::fake();
        $this->fakeYouTube();
        $this->songs();

        $this->actingAs(User::factory()->create())
            ->post('/apps/our-corner/songs', ['url' => self::YOUTUBE, 'title' => 'Our song'])
            ->assertRedirect();

        $this->assertDatabaseHas('corner_items', ['title' => 'Our song', 'author' => 'Test Artist', 'provider_id' => 'dQw4w9WgXcQ']);
    }

    public function test_a_link_whose_lookup_times_out_is_kept_as_itself(): void
    {
        Notification::fake();
        Http::fake(fn () => throw new ConnectionException('Timeout'));
        $adder = User::factory()->create();
        $this->songs();

        $url = 'https://www.youtube.com/watch?v=timeoutVid1';

        $this->actingAs($adder)->post('/apps/our-corner/songs', ['url' => $url])->assertRedirect('/apps/our-corner/songs');

        $this->assertDatabaseHas('corner_items', [
            'title' => $url,
            'url' => $url,
            'provider' => 'unknown',
            'provider_id' => hash('xxh64', $url),
            'image_url' => null,
            'added_by_user_id' => $adder->id,
        ]);
    }

    public function test_a_link_from_any_other_site_is_kept_without_a_lookup(): void
    {
        Notification::fake();
        Http::fake();
        $this->songs();

        $url = 'https://example.com/a-recipe';

        $this->actingAs(User::factory()->create())
            ->post('/apps/our-corner/songs', ['url' => $url])
            ->assertRedirect('/apps/our-corner/songs');

        $this->assertDatabaseHas('corner_items', ['title' => $url, 'provider' => 'unknown', 'provider_id' => hash('xxh64', $url)]);
        Http::assertNothingSent();
    }

    public function test_the_same_link_twice_in_one_list_is_a_field_error_and_no_second_push(): void
    {
        Notification::fake();
        $this->fakeYouTube();
        $adder = User::factory()->create();
        User::factory()->create();
        $list = $this->songs();

        $this->actingAs($adder)->post('/apps/our-corner/songs', ['url' => self::YOUTUBE]);
        $this->assertSame(1, $list->items()->count());
        Notification::assertSentTimes(GenericPushNotification::class, 1);

        // youtu.be is the same video, so the same provider id.
        $this->actingAs($adder)
            ->from('/apps/our-corner/songs')
            ->post('/apps/our-corner/songs', ['url' => 'https://youtu.be/dQw4w9WgXcQ'])
            ->assertRedirect('/apps/our-corner/songs')
            ->assertSessionHasErrors(['url' => ItemDetails::DUPLICATE_LINK]);

        $this->assertSame(1, $list->items()->count());
        Notification::assertSentTimes(GenericPushNotification::class, 1);
    }

    public function test_the_same_link_may_be_in_two_different_lists(): void
    {
        Notification::fake();
        $this->fakeYouTube();
        $adder = User::factory()->create();
        $this->songs();
        $other = CornerList::factory()->kind(ListKind::Link)->create();

        $this->actingAs($adder)->post('/apps/our-corner/songs', ['url' => self::YOUTUBE])->assertSessionHasNoErrors();
        $this->actingAs($adder)->post("/apps/our-corner/{$other->slug}", ['url' => self::YOUTUBE])->assertSessionHasNoErrors();

        $this->assertSame(2, Item::where('provider_id', 'dQw4w9WgXcQ')->count());
    }

    public function test_a_link_list_needs_a_link(): void
    {
        $this->songs();
        $user = User::factory()->create();

        $this->actingAs($user)
            ->from('/apps/our-corner/songs')
            ->post('/apps/our-corner/songs', ['url' => 'not-a-url'])
            ->assertSessionHasErrors(['url' => "That doesn't look like a link."]);

        $this->actingAs($user)
            ->from('/apps/our-corner/songs')
            ->post('/apps/our-corner/songs', ['title' => 'Only a title'])
            ->assertSessionHasErrors(['url' => 'Paste a link to add it.']);

        $this->assertSame(0, Item::count());
    }

    public function test_fields_from_another_kind_are_ignored(): void
    {
        Notification::fake();
        $list = $this->activities();

        $this->actingAs(User::factory()->create())->post("/apps/our-corner/{$list->slug}", [
            'title' => 'Picnic',
            'url' => 'https://example.com',
            'image_url' => 'https://example.com/x.jpg',
            'lat' => 1,
            'lng' => 2,
            'legacy_type' => 'corner.song',
            'legacy_id' => 5,
            'list_id' => 999,
            'added_by_user_id' => 999,
        ])->assertRedirect();

        $item = Item::query()->sole();
        $this->assertSame($list->id, $item->list_id);
        $this->assertNull($item->url);
        $this->assertNull($item->image_url);
        $this->assertNull($item->lat);
        $this->assertNull($item->legacy_type);
        $this->assertNull($item->legacy_id);
    }

    // Posters

    public function test_a_client_sent_poster_is_ignored_and_no_plex_link_means_no_lookup(): void
    {
        Notification::fake();
        Http::fake();
        $this->movies();

        $this->actingAs(User::factory()->create())
            ->post('/apps/our-corner/movies', ['title' => 'Interstellar', 'image_url' => 'https://example.com/poster.jpg'])
            ->assertRedirect('/apps/our-corner/movies');

        $this->assertDatabaseHas('corner_items', ['title' => 'Interstellar', 'image_url' => null, 'url' => null]);
        Http::assertNothingSent();
    }

    public function test_a_plex_link_is_kept_and_its_poster_looked_up_on_the_server(): void
    {
        Notification::fake();
        Http::fake([
            'watch.plex.tv/*' => Http::response(
                '<html><head>'
                .'<meta property="og:title" content="The Man from Earth">'
                .'<meta property="og:image" content="https://images.plex.tv/photo?url=server-derived">'
                .'</head></html>',
                200,
            ),
        ]);
        $this->movies();

        $this->actingAs(User::factory()->create())
            ->post('/apps/our-corner/movies', [
                'title' => 'The Man from Earth',
                'image_url' => 'https://images.plex.tv/photo?url=client-sent',
                'url' => 'https://watch.plex.tv/movie/x',
            ])
            ->assertRedirect('/apps/our-corner/movies');

        $this->assertDatabaseHas('corner_items', [
            'title' => 'The Man from Earth',
            'url' => 'https://watch.plex.tv/movie/x',
            'image_url' => 'https://images.plex.tv/photo?url=server-derived',
        ]);
    }

    public function test_a_poster_list_only_takes_plex_links(): void
    {
        Http::fake();
        $this->movies();

        $this->actingAs(User::factory()->create())
            ->from('/apps/our-corner/movies')
            ->post('/apps/our-corner/movies', ['title' => 'X', 'url' => 'https://evil.com/x'])
            ->assertSessionHasErrors(['url']);

        $this->assertSame(0, Item::count());
        Http::assertNothingSent();
    }

    // Places

    public function test_a_place_keeps_its_google_details(): void
    {
        Notification::fake();
        $adder = User::factory()->create();
        $this->places();

        $this->actingAs($adder)->post('/apps/our-corner/places', [
            'title' => 'Sydney Opera House',
            'place_id' => 'ChIJ3S-JXmauEmsRUcIaWtf4MzE',
            'lat' => -33.8568,
            'lng' => 151.2153,
            'address' => 'Bennelong Point, Sydney NSW 2000',
        ])->assertRedirect('/apps/our-corner/places');

        $this->assertDatabaseHas('corner_items', [
            'title' => 'Sydney Opera House',
            'place_id' => 'ChIJ3S-JXmauEmsRUcIaWtf4MzE',
            'address' => 'Bennelong Point, Sydney NSW 2000',
            'added_by_user_id' => $adder->id,
        ]);
    }

    public function test_a_place_can_be_typed_in_without_google(): void
    {
        Notification::fake();
        $adder = User::factory()->create();
        $this->places();

        $this->actingAs($adder)
            ->post('/apps/our-corner/places', ['title' => 'The bakery on 4th Cross', 'place_id' => '', 'address' => ''])
            ->assertRedirect('/apps/our-corner/places');

        $place = Item::query()->sole();
        $this->assertNull($place->place_id);
        $this->assertNull($place->lat);
        $this->assertNull($place->lng);
        $this->assertNull($place->address);
    }

    public function test_a_place_needs_a_name_and_both_coordinates_or_none(): void
    {
        $this->places();

        $this->actingAs(User::factory()->create())
            ->from('/apps/our-corner/places')
            ->post('/apps/our-corner/places', ['title' => '', 'lat' => 12.34])
            ->assertSessionHasErrors(['title' => 'Give the place a name.', 'lng']);

        $this->assertSame(0, Item::count());
    }

    public function test_coordinates_keep_seven_decimal_places(): void
    {
        Notification::fake();
        $this->places();

        $this->actingAs(User::factory()->create())->post('/apps/our-corner/places', [
            'title' => 'Precision Probe',
            'lat' => 12.3456789,
            'lng' => -98.7654321,
        ])->assertRedirect();

        $place = Item::query()->sole();
        $this->assertSame('12.3456789', $place->lat);
        $this->assertSame('-98.7654321', $place->lng);
    }
}
