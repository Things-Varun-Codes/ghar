<?php

namespace Tests\Feature\Corner;

use App\MiniApps\Corner\Models\CornerList;
use App\MiniApps\Corner\Models\Item;
use App\Shell\Models\User;
use App\Shell\Services\Household;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Feature\Corner\Concerns\MakesCornerLists;
use Tests\TestCase;

class CornerListPageTest extends TestCase
{
    use MakesCornerLists;
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    /** @return array<string, array{0: string}> */
    public static function lists(): array
    {
        return [
            'songs' => ['songs'],
            'movies' => ['movies'],
            'activities' => ['activities'],
            'places' => ['places'],
        ];
    }

    #[DataProvider('lists')]
    public function test_every_list_renders_one_list_page_with_its_settings_and_items(string $slug): void
    {
        $list = $this->listCalled($slug);
        $item = $this->itemIn($list, $this->user, ['notes' => 'A note']);
        // Another list's items never leak in.
        $this->itemIn(CornerList::factory()->create(), $this->user);

        $this->actingAs($this->user)
            ->get("/apps/our-shelf/{$list->slug}")
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('MiniApps/Corner/Pages/List')
                ->where('list.id', $list->id)
                ->where('list.slug', $list->slug)
                ->where('list.name', $list->name)
                ->missing('list.kind')
                ->where('list.done_label', $list->done_label)
                ->where('list.todo_label', $list->todo_label)
                ->where('list.done_icon', $list->done_icon)
                ->where('list.icon', $list->icon)
                ->where('list.notify_on_add', true)
                ->has('items.data', 1)
                ->where('items.data.0.id', $item->id)
                ->where('items.data.0.title', $item->title)
                ->where('items.data.0.notes', 'A note')
                ->where('items.data.0.is_done', false)
                ->where('items.data.0.addedBy.id', $this->user->id)
                ->where('filter', 'active')
                ->where('sort', 'recent')
                ->where('q', null));
    }

    public function test_a_done_item_says_who_marked_it_and_when(): void
    {
        $meera = User::factory()->create(['name' => 'Meera Rao']);
        $list = $this->listCalled('songs');
        $done = Item::factory()->done($meera)->create(['list_id' => $list->id, 'added_by_user_id' => $this->user->id]);
        $this->itemIn($list, $this->user);

        $this->actingAs($this->user)
            ->get("/apps/our-shelf/{$list->slug}?filter=done")
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->has('items.data', 1)
                ->where('items.data.0.id', $done->id)
                ->where('items.data.0.done_by.0.person.name', 'Meera')
                ->where('items.data.0.done_by.0.on', $done->done_at->toDateString()));

        $this->actingAs($this->user)
            ->get("/apps/our-shelf/{$list->slug}?filter=todo")
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('items.data.0.done_by', []));
    }

    public function test_the_person_who_added_an_item_comes_with_their_picture(): void
    {
        config(['shell.media_disk' => 'local']);
        Storage::fake('local', ['serve' => true]);
        Storage::disk('local')->put('avatars/adder.jpg', 'jpeg');
        $adder = User::factory()->withAvatar('avatars/adder.jpg')->create();
        $list = $this->songs();
        $item = $this->itemIn($list, $adder);

        $this->actingAs($this->user)
            ->get("/apps/our-shelf/{$list->slug}")
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('items.data.0.addedBy.id', $adder->id)
                ->where('items.data.0.addedBy.name', app(Household::class)->shortName($adder))
                ->where('items.data.0.addedBy.avatar_url', fn ($url) => str_contains((string) $url, 'avatars/adder.jpg'))
                ->missing('items.data.0.addedBy.avatar_key'));

        $this->actingAs($this->user)
            ->get("/apps/our-shelf/{$list->slug}/{$item->id}")
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('item.addedBy.avatar_url', fn ($url) => str_contains((string) $url, 'avatars/adder.jpg')));
    }

    public function test_the_item_payload_carries_every_part_an_item_can_have(): void
    {
        $songs = $this->songs();
        $song = $this->itemIn($songs, $this->user, ['author' => 'Queen', 'notes' => 'Loud']);
        $places = $this->places();
        $place = $this->itemIn($places, $this->user, [
            'location_label' => 'The bakery',
            'location_url' => 'https://maps.example.com/?q=12.3456789,-98.7654321',
            'place_id' => 'ChIJbakery',
            'lat' => 12.3456789,
            'lng' => -98.7654321,
            'address' => '1 High St',
        ]);
        $doneBy = User::factory()->create();
        $place->markDone($doneBy);

        $this->actingAs($this->user)
            ->get("/apps/our-shelf/songs/{$song->id}")
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('MiniApps/Corner/Pages/Item')
                ->where('list.slug', 'songs')
                ->where('item.id', $song->id)
                ->where('item.title', $song->title)
                ->where('item.notes', 'Loud')
                ->where('item.url', $song->url)
                ->where('item.site_name', $song->site_name)
                ->where('item.author', 'Queen')
                ->where('item.image_url', $song->image_url)
                ->where('item.picture_url', $song->pictureUrl())
                ->where('item.location_label', null)
                ->where('item.lat', null)
                ->where('item.is_done', false)
                ->missing('item.added_by_user_id')
                ->missing('item.added_at')
                ->where('item.addedBy', ['id' => $this->user->id, 'name' => app(Household::class)->shortName($this->user), 'avatar_url' => null])
                ->missing('item.provider')
                ->missing('item.provider_id')
                ->missing('item.url_key'));

        $this->actingAs($this->user)
            ->get("/apps/our-shelf/places/{$place->id}")
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('item.location_label', 'The bakery')
                ->where('item.location_url', 'https://maps.example.com/?q=12.3456789,-98.7654321')
                ->missing('item.place_id')
                ->where('item.lat', 12.3456789)
                ->where('item.lng', -98.7654321)
                ->where('item.address', '1 High St')
                ->where('item.is_done', true)
                ->missing('item.done_at')
                ->where('item.url', null)
                ->where('item.picture_url', null));
    }

    #[DataProvider('lists')]
    public function test_filters_scope_rows_and_counts_stay_whole(string $slug): void
    {
        $list = $this->listCalled($slug);
        $active = $this->itemIn($list, $this->user);
        $done = $this->itemIn($list, $this->user, ['done_at' => now(), 'done_by_user_id' => $this->user->id]);

        $this->actingAs($this->user)
            ->get("/apps/our-shelf/{$list->slug}?filter=active")
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('filter', 'active')
                ->has('items.data', 1)
                ->where('items.data.0.id', $active->id)
                ->where('items.counts.all', 2)
                ->where('items.counts.active', 1)
                ->where('items.counts.done', 1));

        $this->actingAs($this->user)
            ->get("/apps/our-shelf/{$list->slug}?filter=done")
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('filter', 'done')
                ->has('items.data', 1)
                ->where('items.data.0.id', $done->id));

        $this->actingAs($this->user)
            ->get("/apps/our-shelf/{$list->slug}?filter=all")
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('filter', 'all')
                ->has('items.data', 2));

        foreach (['', '?filter=garbage', '?filter[]=done'] as $query) {
            $this->actingAs($this->user)
                ->get("/apps/our-shelf/{$list->slug}{$query}")
                ->assertInertia(fn (AssertableInertia $page) => $page
                    ->where('filter', 'active')
                    ->has('items.data', 1)
                    ->where('items.data.0.id', $active->id));
        }
    }

    public function test_a_list_with_nothing_left_to_do_opens_on_everything(): void
    {
        $list = $this->listCalled('movies');
        $this->itemIn($list, $this->user, ['done_at' => now(), 'done_by_user_id' => $this->user->id]);

        $this->actingAs($this->user)
            ->get("/apps/our-shelf/{$list->slug}")
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('filter', 'all')
                ->has('items.data', 1));

        $this->actingAs($this->user)
            ->get("/apps/our-shelf/{$list->slug}?filter=active")
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('filter', 'active')
                ->has('items.data', 0));
    }

    public function test_a_page_holds_fifty_rows_and_the_next_link_keeps_the_filter(): void
    {
        $list = $this->movies();
        Item::factory()->count(60)->create(['list_id' => $list->id, 'added_by_user_id' => $this->user->id]);
        Item::factory()->count(3)->done($this->user)->create(['list_id' => $list->id, 'added_by_user_id' => $this->user->id]);

        $this->actingAs($this->user)
            ->get('/apps/our-shelf/movies?filter=active')
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->has('items.data', 50)
                ->where('items.per_page', 50)
                ->where('items.counts.all', 63)
                ->where('items.counts.active', 60)
                ->where('items.counts.done', 3)
                ->where('items.next_page_url', fn ($url) => str_contains((string) $url, 'filter=active'))
                ->missing('items.total')
                ->missing('items.last_page')
                ->missing('items.current_page'));
    }

    public function test_the_second_page_continues_where_the_first_stopped(): void
    {
        $list = $this->activities();
        Item::factory()->count(55)->sequence(fn ($s) => ['added_at' => now()->subMinutes($s->index)])
            ->create(['list_id' => $list->id, 'added_by_user_id' => $this->user->id]);

        $first = $this->actingAs($this->user)->get("/apps/our-shelf/{$list->slug}");
        $props = $first->viewData('page')['props'];
        $seen = array_column($props['items']['data'], 'id');

        $second = $this->actingAs($this->user)->get($props['items']['next_page_url']);
        $more = array_column($second->viewData('page')['props']['items']['data'], 'id');

        $this->assertCount(5, $more);
        $this->assertSame([], array_intersect($seen, $more));
        $this->assertNull($second->viewData('page')['props']['items']['next_page_url']);
    }

    public function test_equal_times_fall_back_to_the_newest_id(): void
    {
        $list = $this->movies();
        $ts = now()->setMicroseconds(0);
        $ids = collect(range(1, 3))
            ->map(fn () => $this->itemIn($list, $this->user, ['added_at' => $ts])->id)
            ->all();

        $this->actingAs($this->user)
            ->get('/apps/our-shelf/movies')
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('items.data.0.id', $ids[2])
                ->where('items.data.1.id', $ids[1])
                ->where('items.data.2.id', $ids[0]));
    }

    public function test_search_narrows_rows_and_counts_and_matches_the_author_and_site(): void
    {
        $list = $this->songs();
        $match = $this->itemIn($list, $this->user, ['title' => 'Bohemian Rhapsody', 'author' => 'Queen']);
        $byAuthor = $this->itemIn($list, $this->user, ['title' => 'Some Song', 'author' => 'Radiohead']);
        $this->itemIn($list, $this->user, ['title' => 'Imagine', 'author' => 'John Lennon']);

        $this->actingAs($this->user)
            ->get('/apps/our-shelf/songs?q=bohemian')
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->has('items.data', 1)
                ->where('items.data.0.id', $match->id)
                ->where('items.counts.all', 1)
                ->where('q', 'bohemian'));

        $this->actingAs($this->user)
            ->get('/apps/our-shelf/songs?q=radiohead')
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->has('items.data', 1)
                ->where('items.data.0.id', $byAuthor->id));

        $this->actingAs($this->user)
            ->get('/apps/our-shelf/songs?q='.urlencode((string) $match->site_name))
            ->assertInertia(fn (AssertableInertia $page) => $page->where('items.data', fn ($rows) => collect($rows)->pluck('id')->contains($match->id)));

        // Blank and whitespace-only searches are no search.
        $this->actingAs($this->user)
            ->get('/apps/our-shelf/songs?q=%20%20')
            ->assertInertia(fn (AssertableInertia $page) => $page->where('q', null)->has('items.data', 3));
    }

    public function test_search_reads_the_notes_and_a_places_name_and_address(): void
    {
        $activities = $this->activities();
        $noted = $this->itemIn($activities, $this->user, ['title' => 'Hike', 'notes' => 'Bring sunscreen']);
        $this->itemIn($activities, $this->user, ['title' => 'Swim']);

        $places = $this->places();
        $bakery = $this->itemIn($places, $this->user, ['title' => 'Bakery', 'address' => '4 Market Street, Mysuru']);
        $this->itemIn($places, $this->user, ['title' => 'Cafe', 'address' => '1 Fort Road, Kochi']);

        $this->actingAs($this->user)
            ->get("/apps/our-shelf/{$activities->slug}?q=sunscreen")
            ->assertInertia(fn (AssertableInertia $page) => $page->has('items.data', 1)->where('items.data.0.id', $noted->id));

        $this->actingAs($this->user)
            ->get('/apps/our-shelf/places?q=mysuru')
            ->assertInertia(fn (AssertableInertia $page) => $page->has('items.data', 1)->where('items.data.0.id', $bakery->id));

        $this->itemIn($places, $this->user, ['title' => 'Dosa', 'location_label' => 'Vidyarthi Bhavan', 'address' => null]);
        $this->actingAs($this->user)
            ->get('/apps/our-shelf/places?q=vidyarthi')
            ->assertInertia(fn (AssertableInertia $page) => $page->has('items.data', 1)->where('items.data.0.title', 'Dosa'));
    }

    public function test_search_treats_wildcards_as_text(): void
    {
        $list = $this->activities();
        $this->itemIn($list, $this->user, ['title' => '100% fun']);
        $this->itemIn($list, $this->user, ['title' => '100 fun']);

        $this->actingAs($this->user)
            ->get("/apps/our-shelf/{$list->slug}?q=".urlencode('0%'))
            ->assertInertia(fn (AssertableInertia $page) => $page->has('items.data', 1)->where('items.data.0.title', '100% fun'));
    }

    #[DataProvider('lists')]
    public function test_every_list_sorts_by_newest_or_by_name_and_nothing_else(string $slug): void
    {
        $list = $this->listCalled($slug);
        $this->itemIn($list, $this->user, ['title' => 'Zebra', 'author' => 'Alpha Artist', 'added_at' => now()]);
        $this->itemIn($list, $this->user, ['title' => 'Alpha', 'author' => 'Zeta Artist', 'added_at' => now()->subDay()]);

        $this->actingAs($this->user)
            ->get("/apps/our-shelf/{$list->slug}?sort=title")
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('sorts', ['recent', 'title'])
                ->where('sort', 'title')
                ->where('items.data.0.title', 'Alpha')
                ->where('items.data.1.title', 'Zebra'));

        $this->actingAs($this->user)
            ->get("/apps/our-shelf/{$list->slug}?sort=artist")
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('sort', 'recent')
                ->where('items.data.0.title', 'Zebra'));
    }

    public function test_no_sort_or_a_garbage_sort_is_newest_first(): void
    {
        $list = $this->songs();
        $older = $this->itemIn($list, $this->user, ['added_at' => Carbon::now()->subDay()]);
        $newer = $this->itemIn($list, $this->user, ['added_at' => Carbon::now()]);

        foreach (['', '?sort=garbage', '?sort[]=title'] as $query) {
            $this->actingAs($this->user)
                ->get("/apps/our-shelf/songs{$query}")
                ->assertInertia(fn (AssertableInertia $page) => $page
                    ->where('sort', 'recent')
                    ->where('items.data.0.id', $newer->id)
                    ->where('items.data.1.id', $older->id));
        }
    }

    public function test_a_missing_list_renders_a_page_saying_so(): void
    {
        $this->actingAs($this->user)
            ->get('/apps/our-shelf/no-such-list')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('MiniApps/Corner/Pages/EntityNotFound')
                ->where('kind', 'list'));

        $this->actingAs($this->user)
            ->get('/apps/our-shelf/no-such-list/1')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('MiniApps/Corner/Pages/EntityNotFound')
                ->where('kind', 'list'));
    }

    public function test_a_missing_item_renders_a_page_saying_so(): void
    {
        $list = $this->movies();
        $elsewhere = $this->itemIn(CornerList::factory()->create(), $this->user);
        $missing = (int) Item::max('id') + 1000;

        foreach ([(string) $missing, (string) $elsewhere->id, 'abc', '-1'] as $id) {
            $this->actingAs($this->user)
                ->get("/apps/our-shelf/{$list->slug}/{$id}")
                ->assertOk()
                ->assertInertia(fn (AssertableInertia $page) => $page
                    ->component('MiniApps/Corner/Pages/EntityNotFound')
                    ->where('kind', 'item'));
        }
    }

    public function test_an_old_link_still_opens_the_item_and_so_does_its_new_id(): void
    {
        $list = $this->songs();
        $legacyId = 7;
        $song = $this->itemIn($list, $this->user, ['legacy_type' => 'corner.song', 'legacy_id' => $legacyId]);
        $this->assertNotSame($legacyId, $song->id);

        foreach ([$legacyId, $song->id] as $id) {
            $this->actingAs($this->user)
                ->get("/apps/our-shelf/songs/{$id}")
                ->assertOk()
                ->assertInertia(fn (AssertableInertia $page) => $page
                    ->component('MiniApps/Corner/Pages/Item')
                    ->where('item.id', $song->id));
        }

        // An old id only counts in the list it came from.
        $this->actingAs($this->user)
            ->get("/apps/our-shelf/{$this->movies()->slug}/{$legacyId}")
            ->assertInertia(fn (AssertableInertia $page) => $page->component('MiniApps/Corner/Pages/EntityNotFound'));
    }

    public function test_a_new_id_wins_over_an_old_one_that_happens_to_match(): void
    {
        $list = $this->songs();
        $newer = $this->itemIn($list, $this->user);
        // An old item whose old id equals the newer item's id.
        $this->itemIn($list, $this->user, ['legacy_type' => 'corner.song', 'legacy_id' => $newer->id]);

        $this->actingAs($this->user)
            ->get("/apps/our-shelf/songs/{$newer->id}")
            ->assertInertia(fn (AssertableInertia $page) => $page->where('item.id', $newer->id));
    }

    public function test_guests_are_sent_to_log_in(): void
    {
        $list = $this->songs();

        $this->get('/apps/our-shelf')->assertRedirect('/login');
        $this->get("/apps/our-shelf/{$list->slug}")->assertRedirect('/login');
        $this->post("/apps/our-shelf/{$list->slug}", ['title' => 'X'])->assertRedirect('/login');
    }
}
