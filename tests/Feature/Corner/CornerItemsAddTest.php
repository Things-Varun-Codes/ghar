<?php

namespace Tests\Feature\Corner;

use App\MiniApps\Corner\Actions\AddItem;
use App\MiniApps\Corner\Models\CornerList;
use App\MiniApps\Corner\Models\Item;
use App\MiniApps\Corner\Support\ItemDetails;
use App\MiniApps\Corner\Support\LinkKey;
use App\Shell\Models\User;
use App\Shell\Notifications\GenericPushNotification;
use App\Shell\Support\Http\SafeFetcher;
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

    private const SONG = 'https://music.example.com/watch?v=abc123';

    protected function setUp(): void
    {
        parent::setUp();
        $this->publicDns();
    }

    private function fakeSongPage(): void
    {
        Http::fake([
            'music.example.com/*' => Http::response(
                '<html><head><title>Ignored title</title>'
                .'<meta property="og:title" content="Test Track">'
                .'<meta property="og:image" content="/covers/abc.jpg">'
                .'<meta property="og:site_name" content="Example Music">'
                .'<meta name="author" content="Test Artist">'
                .'</head><body></body></html>',
                200,
                ['Content-Type' => 'text/html; charset=utf-8'],
            ),
        ]);
    }

    /**
     * @return array<string, array{0: string, 1: array<string, mixed>, 2: string}>
     */
    public static function shapes(): array
    {
        return [
            'a link' => ['songs', ['url' => self::SONG], 'Test Track'],
            'a name' => ['movies', ['title' => 'Inception'], 'Inception'],
            'a name and notes' => ['activities', ['title' => 'Beach trip', 'notes' => 'Bring towels'], 'Beach trip'],
            'a place' => ['places', ['title' => 'Sydney Opera House', 'location' => '-33.8568, 151.2153'], 'Sydney Opera House'],
        ];
    }

    /** @param  array<string, mixed>  $payload */
    #[DataProvider('shapes')]
    public function test_adding_an_item_toasts_redirects_to_the_bare_list_and_pushes_the_household(string $slug, array $payload, string $title): void
    {
        Notification::fake();
        $this->fakeSongPage();

        $adder = User::factory()->create(['name' => 'Alice Smith']);
        $recipient = User::factory()->create(['name' => 'Bob Jones']);
        $list = $this->listCalled($slug);

        $this->actingAs($adder)
            ->from("/apps/our-shelf/{$list->slug}?q=zzz&filter=done")
            ->post("/apps/our-shelf/{$list->slug}", $payload)
            ->assertRedirect("/apps/our-shelf/{$list->slug}")
            ->assertSessionHas(SessionKey::FLASH_DATA, ['toast' => ['type' => 'success', 'message' => "Added to {$list->name}."]]);

        $item = Item::query()->sole();
        $this->assertSame($list->id, $item->list_id);
        $this->assertSame($title, $item->title);
        $this->assertSame($adder->id, $item->added_by_user_id);
        $this->assertNull($item->done_at);
        $this->assertNull($item->legacy_type);
        $this->assertNull($item->legacy_id);

        $itemUrl = "/apps/our-shelf/{$list->slug}/{$item->id}";

        Notification::assertSentTo(
            $recipient,
            GenericPushNotification::class,
            function (GenericPushNotification $n) use ($recipient, $itemUrl, $list, $title) {
                $webPush = $n->toWebPush($recipient, $n)->toArray();

                return ($webPush['tag'] ?? null) === "our-shelf:{$list->slug}"
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
            ->post("/apps/our-shelf/{$list->slug}", ['title' => 'Muted'])
            ->assertRedirect("/apps/our-shelf/{$list->slug}");

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
            ->post('/apps/our-shelf/no-such-list', ['title' => 'X'])
            ->assertNotFound();

        $this->assertSame(0, Item::count());
    }

    public function test_any_notes_are_kept_and_blank_notes_become_null(): void
    {
        Notification::fake();
        $adder = User::factory()->create();
        $list = $this->activities();

        $this->actingAs($adder)->post("/apps/our-shelf/{$list->slug}", [
            'title' => 'Hiking',
            'notes' => 'Bring water and snacks; start before sunrise.',
        ])->assertRedirect();

        $this->actingAs($adder)->post("/apps/our-shelf/{$list->slug}", [
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
            ->from("/apps/our-shelf/{$list->slug}")
            ->post("/apps/our-shelf/{$list->slug}", ['title' => 'Long', 'notes' => str_repeat('a', 2001)])
            ->assertSessionHasErrors(['notes' => 'Notes are limited to 2000 characters.']);

        $this->assertSame(0, Item::count());
    }

    public function test_a_name_is_required_unless_there_is_a_link_to_take_one_from(): void
    {
        Notification::fake();
        Http::fake(['*' => Http::response('', 500)]);
        $list = $this->activities();
        $user = User::factory()->create();

        $this->actingAs($user)
            ->from("/apps/our-shelf/{$list->slug}")
            ->post("/apps/our-shelf/{$list->slug}", ['title' => '  '])
            ->assertSessionHasErrors(['title' => 'Give it a name, or paste a link to take one from.']);
        $this->assertSame(0, Item::count());

        $this->actingAs($user)
            ->post("/apps/our-shelf/{$list->slug}", ['url' => 'https://example.com/a-recipe'])
            ->assertSessionHasNoErrors();
        $this->assertSame(1, Item::count());
    }

    public function test_only_web_addresses_are_links(): void
    {
        Http::fake();
        $list = $this->songs();
        $user = User::factory()->create();

        foreach (['not-a-url', 'javascript:alert(1)', 'ftp://example.com/song.mp3'] as $bad) {
            $this->actingAs($user)
                ->from('/apps/our-shelf/songs')
                ->post('/apps/our-shelf/songs', ['title' => 'X', 'url' => $bad])
                ->assertSessionHasErrors(['url' => "That doesn't look like a web address."]);
        }

        $this->actingAs($user)
            ->from('/apps/our-shelf/songs')
            ->post('/apps/our-shelf/songs', ['title' => 'X', 'image_url' => 'data:image/png;base64,AAAA'])
            ->assertSessionHasErrors(['image_url' => "That doesn't look like the address of a picture."]);

        $this->assertSame(0, $list->items()->count());
        Http::assertNothingSent();
    }

    // Links

    public function test_a_link_fills_the_name_picture_author_and_site_from_its_page(): void
    {
        Notification::fake();
        $this->fakeSongPage();
        $adder = User::factory()->create();
        $list = $this->songs();

        $this->actingAs($adder)->post('/apps/our-shelf/songs', ['url' => self::SONG])->assertRedirect('/apps/our-shelf/songs');

        $this->assertDatabaseHas('corner_items', [
            'list_id' => $list->id,
            'url' => self::SONG,
            'url_key' => LinkKey::for(self::SONG),
            'title' => 'Test Track',
            'author' => 'Test Artist',
            'site_name' => 'Example Music',
            'image_url' => 'https://music.example.com/covers/abc.jpg',
            'added_by_user_id' => $adder->id,
        ]);
    }

    public function test_a_typed_name_and_a_pasted_picture_win_over_the_page(): void
    {
        Notification::fake();
        $this->fakeSongPage();
        $this->songs();

        $this->actingAs(User::factory()->create())
            ->post('/apps/our-shelf/songs', [
                'url' => self::SONG,
                'title' => 'Our song',
                'image_url' => 'https://photos.example.org/us.jpg',
            ])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('corner_items', [
            'title' => 'Our song',
            'author' => 'Test Artist',
            'image_url' => 'https://photos.example.org/us.jpg',
        ]);
    }

    public function test_no_picture_keeps_the_pages_picture_off(): void
    {
        Notification::fake();
        $this->fakeSongPage();
        $this->songs();

        $this->actingAs(User::factory()->create())
            ->post('/apps/our-shelf/songs', ['url' => self::SONG, 'no_picture' => true])
            ->assertSessionHasNoErrors();

        $item = Item::query()->sole();
        $this->assertSame('Test Track', $item->title);
        $this->assertNull($item->image_url);
        $this->assertNull($item->pictureUrl());
    }

    public function test_a_link_straight_to_a_picture_is_its_own_picture(): void
    {
        Notification::fake();
        Http::fake(['photos.example.org/*' => Http::response('bytes', 200, ['Content-Type' => 'image/jpeg'])]);
        $this->activities();

        $this->actingAs(User::factory()->create())
            ->post('/apps/our-shelf/activities', ['url' => 'https://photos.example.org/kite.jpg', 'title' => 'Kite day'])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('corner_items', [
            'title' => 'Kite day',
            'image_url' => 'https://photos.example.org/kite.jpg',
            'site_name' => 'photos.example.org',
        ]);
    }

    public function test_a_link_whose_page_times_out_and_has_no_words_is_kept_as_itself(): void
    {
        Notification::fake();
        Http::fake(fn () => throw new ConnectionException('Timeout'));
        $adder = User::factory()->create();
        $this->songs();

        $url = 'https://www.example.com/v/timeoutVid1';

        $this->actingAs($adder)->post('/apps/our-shelf/songs', ['url' => $url])->assertRedirect('/apps/our-shelf/songs');

        $this->assertDatabaseHas('corner_items', [
            'title' => $url,
            'url' => $url,
            'url_key' => LinkKey::for($url),
            'site_name' => 'example.com',
            'author' => null,
            'image_url' => null,
            'added_by_user_id' => $adder->id,
        ]);
    }

    public function test_a_link_to_a_private_address_is_named_from_itself_without_fetching_it(): void
    {
        Notification::fake();
        Http::fake();
        $this->app->instance(SafeFetcher::class, new SafeFetcher(fn (): array => ['10.0.0.5']));
        $this->songs();

        $url = 'https://intranet.example.com/admin';

        $this->actingAs(User::factory()->create())
            ->post('/apps/our-shelf/songs', ['url' => $url])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('corner_items', ['title' => 'admin', 'site_name' => 'intranet.example.com', 'image_url' => null]);
        Http::assertNothingSent();
    }

    public function test_the_same_link_twice_in_one_list_is_a_field_error_and_no_second_push(): void
    {
        Notification::fake();
        $this->fakeSongPage();
        $adder = User::factory()->create();
        User::factory()->create();
        $list = $this->songs();

        $this->actingAs($adder)->post('/apps/our-shelf/songs', ['url' => self::SONG]);
        $this->assertSame(1, $list->items()->count());
        Notification::assertSentTimes(GenericPushNotification::class, 1);

        // Written differently, but the same page.
        $this->actingAs($adder)
            ->from('/apps/our-shelf/songs')
            ->post('/apps/our-shelf/songs', ['url' => 'HTTPS://Music.Example.com:443/watch/?utm_source=chat&v=abc123#t=30'])
            ->assertRedirect('/apps/our-shelf/songs')
            ->assertSessionHasErrors(['url' => ItemDetails::DUPLICATE_LINK]);

        $this->assertSame(1, $list->items()->count());
        Notification::assertSentTimes(GenericPushNotification::class, 1);
    }

    public function test_the_same_link_may_be_in_two_different_lists(): void
    {
        Notification::fake();
        $this->fakeSongPage();
        $adder = User::factory()->create();
        $this->songs();
        $other = CornerList::factory()->create();

        $this->actingAs($adder)->post('/apps/our-shelf/songs', ['url' => self::SONG])->assertSessionHasNoErrors();
        $this->actingAs($adder)->post("/apps/our-shelf/{$other->slug}", ['url' => self::SONG])->assertSessionHasNoErrors();

        $this->assertSame(2, Item::where('url_key', LinkKey::for(self::SONG))->count());
    }

    public function test_fields_nobody_may_set_are_ignored(): void
    {
        Notification::fake();
        $list = $this->activities();

        $this->actingAs(User::factory()->create())->post("/apps/our-shelf/{$list->slug}", [
            'title' => 'Picnic',
            'url_key' => 'forged',
            'site_name' => 'Forged',
            'author' => 'Forged',
            'legacy_type' => 'corner.song',
            'legacy_id' => 5,
            'list_id' => 999,
            'added_by_user_id' => 999,
            'done_at' => now()->toIso8601String(),
        ])->assertRedirect();

        $item = Item::query()->sole();
        $this->assertSame($list->id, $item->list_id);
        $this->assertNull($item->url_key);
        $this->assertNull($item->site_name);
        $this->assertNull($item->author);
        $this->assertNull($item->legacy_type);
        $this->assertNull($item->legacy_id);
        $this->assertNull($item->done_at);
    }

    // Names and sites, the same for every page

    private const SHORT_LINK = 'https://go.example.com/s/park';

    private const LANDED = 'https://maps.example.com/place/park-inn';

    /** A short link that lands on a page whose site name repeats its title, as some sites do. */
    private function fakeLandingPage(string $title): void
    {
        Http::fake([
            'go.example.com/*' => Http::response('', 302, ['Location' => self::LANDED]),
            'maps.example.com/*' => Http::response(
                '<html><head><meta property="og:title" content="'.$title.'">'
                .'<meta property="og:site_name" content="'.$title.'">'
                .'<meta property="og:image" content="https://photos.example.com/inn.jpg"></head></html>',
                200,
                ['Content-Type' => 'text/html'],
            ),
        ]);
    }

    public function test_a_name_and_details_title_is_named_by_its_first_part_on_the_site_it_landed_on(): void
    {
        Notification::fake();
        $this->fakeLandingPage('Park&#39;s Inn · 708 W Wise St, Bowie, TX 76230');
        $this->places();

        $this->actingAs(User::factory()->create())
            ->post('/apps/our-shelf/places', ['url' => self::SHORT_LINK, 'title' => ''])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('corner_items', [
            'url' => self::SHORT_LINK,
            'title' => "Park's Inn",
            'site_name' => 'maps.example.com',
            'image_url' => 'https://photos.example.com/inn.jpg',
        ]);
    }

    public function test_a_page_titled_only_with_its_sites_name_is_named_from_its_link(): void
    {
        Notification::fake();
        $this->fakeLandingPage('Maps');
        $this->places();

        $this->actingAs(User::factory()->create())
            ->post('/apps/our-shelf/places', ['url' => self::LANDED, 'title' => ''])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('corner_items', ['url' => self::LANDED, 'title' => 'park inn', 'site_name' => 'maps.example.com']);
    }

    public function test_the_preview_tidies_the_name_and_the_site_the_same_way(): void
    {
        $this->fakeLandingPage('Park&#39;s Inn · 708 W Wise St');

        $this->actingAs(User::factory()->create())
            ->getJson('/api/corner/link-preview?url='.urlencode(self::SHORT_LINK))
            ->assertOk()
            ->assertJsonPath('title', "Park's Inn")
            ->assertJsonPath('site_name', 'maps.example.com');
    }
}
