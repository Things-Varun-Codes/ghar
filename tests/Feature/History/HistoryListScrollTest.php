<?php

namespace Tests\Feature\History;

use App\MiniApps\History\Actions\AttachMedia;
use App\MiniApps\History\Models\Event;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Support\Header;
use Tests\TestCase;

/** Timeline and Gallery as Inertia scroll props, and the photo poll's `converting` prop. */
class HistoryListScrollTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('s3');
        Storage::disk('s3')->buildTemporaryUrlsUsing(
            fn (string $path) => 'https://fake-bucket.example.com/'.$path.'?signed=1'
        );

        $this->user = User::factory()->create();
    }

    /** @return array<string, mixed> */
    private function partial(string $url, string $component, string $only, array $headers = []): array
    {
        $version = $this->actingAs($this->user)->get($url)->viewData('page')['version'];

        return $this->withHeaders([
            'X-Inertia' => 'true',
            'X-Inertia-Version' => (string) $version,
            'X-Inertia-Partial-Component' => $component,
            'X-Inertia-Partial-Data' => $only,
            ...$headers,
        ])->get($url)->assertOk()->json();
    }

    public function test_the_timeline_is_a_cursor_scroll_prop_that_starts_over_unless_loading_more(): void
    {
        Event::factory()->count(25)->create(['creator_id' => $this->user->id]);

        $page = $this->actingAs($this->user)->get('/apps/our-history')->viewData('page');

        $this->assertSame('cursor', $page['scrollProps']['events']['pageName']);
        $this->assertNotNull($page['scrollProps']['events']['nextPage']);
        $this->assertTrue($page['scrollProps']['events']['reset']);
        $this->assertCount(20, $page['props']['events']['data']);

        $next = $page['scrollProps']['events']['nextPage'];
        $more = $this->partial(
            '/apps/our-history?cursor='.$next,
            'MiniApps/History/Pages/Timeline',
            'events',
            [Header::INFINITE_SCROLL_MERGE_INTENT => 'append'],
        );

        $this->assertFalse($more['scrollProps']['events']['reset']);
        $this->assertContains('events.data', $more['mergeProps']);
        $this->assertCount(5, $more['props']['events']['data']);
        $this->assertNull($more['scrollProps']['events']['nextPage']);
    }

    public function test_the_gallery_is_a_page_scroll_prop_that_starts_over_unless_loading_more(): void
    {
        $event = Event::factory()->create(['creator_id' => $this->user->id]);
        app(AttachMedia::class)->photo($event, UploadedFile::fake()->image('p.jpg', 80, 60), $this->user);

        $page = $this->actingAs($this->user)->get('/apps/our-history/gallery')->viewData('page');

        $this->assertSame('page', $page['scrollProps']['media']['pageName']);
        $this->assertTrue($page['scrollProps']['media']['reset']);
        $this->assertCount(1, $page['props']['media']['data']);

        $more = $this->partial(
            '/apps/our-history/gallery?page=1',
            'MiniApps/History/Pages/Gallery',
            'media',
            [Header::INFINITE_SCROLL_MERGE_INTENT => 'append'],
        );

        $this->assertFalse($more['scrollProps']['media']['reset']);
    }

    public function test_the_timeline_poll_gets_only_the_moments_it_names_and_leaves_the_list_alone(): void
    {
        [$asked, $alsoAsked, $other] = Event::factory()->count(3)->create(['creator_id' => $this->user->id]);

        $full = $this->actingAs($this->user)->get('/apps/our-history');
        $this->assertArrayNotHasKey('converting', $full->viewData('page')['props']);

        $poll = $this->partial(
            "/apps/our-history?converting={$asked->id},{$alsoAsked->id},x,-1",
            'MiniApps/History/Pages/Timeline',
            'converting',
        );

        $this->assertSame(['errors', 'converting'], array_keys($poll['props']));
        $this->assertArrayNotHasKey('events', $poll['scrollProps'] ?? []);
        $this->assertEqualsCanonicalizing(
            [$asked->id, $alsoAsked->id],
            array_column($poll['props']['converting'], 'id'),
        );
        $this->assertArrayHasKey('media', $poll['props']['converting'][0]);
        $this->assertNotContains($other->id, array_column($poll['props']['converting'], 'id'));
    }

    public function test_the_gallery_poll_gets_only_the_tiles_it_names(): void
    {
        $event = Event::factory()->create(['creator_id' => $this->user->id]);
        app(AttachMedia::class)->photo($event, UploadedFile::fake()->image('a.jpg', 80, 60), $this->user);
        app(AttachMedia::class)->photo($event, UploadedFile::fake()->image('b.jpg', 80, 60), $this->user);
        $asked = $event->getMedia('photos')->first();

        $poll = $this->partial(
            "/apps/our-history/gallery?converting={$asked->id}",
            'MiniApps/History/Pages/Gallery',
            'converting',
        );

        $this->assertSame(['errors', 'converting'], array_keys($poll['props']));
        $this->assertSame([$asked->id], array_column($poll['props']['converting'], 'id'));
        $this->assertArrayHasKey('pending', $poll['props']['converting'][0]);
        $this->assertSame($event->title ?? '', $poll['props']['converting'][0]['event_title']);
    }
}
