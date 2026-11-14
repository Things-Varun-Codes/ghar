<?php

namespace Tests\Feature\History;

use App\MiniApps\History\Actions\AttachMedia;
use App\MiniApps\History\Models\Event;
use App\Shell\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class HistoryGallerySignedUrlRefreshTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('s3');
        Storage::disk('s3')->buildTemporaryUrlsUsing(
            fn (string $path, \DateTimeInterface $expiration) => 'https://fake-bucket.example.com/'.$path
                .'?X-Amz-Expires=3600&X-Amz-Date='.(
                    $expiration instanceof Carbon
                        ? $expiration->toIso8601String()
                        : (new Carbon($expiration))->toIso8601String()
                )
        );

        $this->user = User::factory()->create();
    }

    public function test_gallery_renders_signed_urls(): void
    {
        $event = Event::factory()->create(['creator_id' => $this->user->id]);
        $photo = UploadedFile::fake()->image('moment.jpg', 1200, 900);
        app(AttachMedia::class)->photo($event, $photo, $this->user);

        $response = $this->actingAs($this->user)
            ->get('/apps/our-history/gallery')
            ->assertStatus(200);

        $media = $response->inertiaProps('media')['data'];
        $this->assertNotEmpty($media, 'Expected at least one media item in gallery props');

        $originalUrl = $media[0]['original'] ?? null;
        $this->assertNotNull($originalUrl, 'media[0].original must be present');
        $this->assertStringStartsWith('https://', $originalUrl, 'original must be a full signed URL');
        $this->assertStringContainsString('X-Amz-', $originalUrl, 'original must contain signed URL query params');
    }

    public function test_gallery_filter_type_photos_only(): void
    {
        $event = Event::factory()->create(['creator_id' => $this->user->id]);
        app(AttachMedia::class)->photo($event, UploadedFile::fake()->image('p.jpg', 800, 600), $this->user);
        app(AttachMedia::class)->video($event, UploadedFile::fake()->create('v.mp4', 100, 'video/mp4'), null, $this->user);

        $response = $this->actingAs($this->user)
            ->get('/apps/our-history/gallery?type=photos')
            ->assertStatus(200);

        $media = $response->inertiaProps('media')['data'];
        $this->assertNotEmpty($media, 'Expected photo items in gallery with type=photos filter');

        foreach ($media as $item) {
            $this->assertSame('photo', $item['kind'], "All items with type=photos filter must have kind='photo'");
        }
    }

    public function test_gallery_filter_type_videos_only(): void
    {
        $event = Event::factory()->create(['creator_id' => $this->user->id]);
        app(AttachMedia::class)->photo($event, UploadedFile::fake()->image('p.jpg', 800, 600), $this->user);
        app(AttachMedia::class)->video($event, UploadedFile::fake()->create('v.mp4', 100, 'video/mp4'), null, $this->user);

        $response = $this->actingAs($this->user)
            ->get('/apps/our-history/gallery?type=videos')
            ->assertStatus(200);

        $media = $response->inertiaProps('media')['data'];
        $this->assertNotEmpty($media, 'Expected video items in gallery with type=videos filter');

        foreach ($media as $item) {
            $this->assertSame('video', $item['kind'], "All items with type=videos filter must have kind='video'");
        }
    }

    public function test_gallery_excludes_video_posters_as_standalone_tiles(): void
    {
        $event = Event::factory()->create(['creator_id' => $this->user->id]);
        $video = UploadedFile::fake()->create('clip.mp4', 200, 'video/mp4');
        $poster = UploadedFile::fake()->image('poster.jpg', 1280, 720);
        app(AttachMedia::class)->video($event, $video, $poster, $this->user);

        $response = $this->actingAs($this->user)
            ->get('/apps/our-history/gallery')
            ->assertStatus(200);

        $media = $response->inertiaProps('media')['data'];
        // The gallery must have exactly 1 item (the video) — the poster is NOT a tile.
        $this->assertCount(1, $media, 'video-poster must not appear as a standalone gallery tile');
        $this->assertSame('video', $media[0]['kind'], 'The single gallery item must be the video');
    }

    public function test_gallery_order_oldest_first_reverses_sort(): void
    {
        // Older event (2023) — expected to sort FIRST under oldest-first.
        $olderEvent = Event::factory()->create([
            'occurred_on' => '2023-05-10',
            'creator_id' => $this->user->id,
            'title' => 'OlderMoment',
        ]);
        app(AttachMedia::class)->photo($olderEvent, UploadedFile::fake()->image('old.jpg', 800, 600), $this->user);

        // Newer event (2025) — expected to sort AFTER the older one under oldest-first.
        $newerEvent = Event::factory()->create([
            'occurred_on' => '2025-09-20',
            'creator_id' => $this->user->id,
            'title' => 'NewerMoment',
        ]);
        app(AttachMedia::class)->photo($newerEvent, UploadedFile::fake()->image('new.jpg', 800, 600), $this->user);

        $response = $this->actingAs($this->user)
            ->get('/apps/our-history/gallery?order=oldest-first')
            ->assertStatus(200);

        $this->assertSame('oldest-first', $response->inertiaProps('order'), "'order' prop must be 'oldest-first' when ?order=oldest-first");
        $this->assertSame(
            'OlderMoment',
            $response->inertiaProps('media')['data'][0]['event_title'] ?? null,
            'Oldest event media must sort first under oldest-first order',
        );
    }

    public function test_gallery_paginates_main_media_list(): void
    {
        // Create 6 events across distinct dates, 5 photos each = 30 total.  Newest event last
        // so we can identify it by title for the order assertion.
        $dates = ['2020-01-15', '2021-03-10', '2022-06-20', '2023-09-05', '2024-11-30', '2025-07-22'];
        $newestTitle = 'NewestPaginationEvent';

        foreach ($dates as $i => $date) {
            $isNewest = ($date === '2025-07-22');
            $event = Event::factory()->create([
                'occurred_on' => $date,
                'creator_id' => $this->user->id,
                'title' => $isNewest ? $newestTitle : "PaginationEvent{$i}",
            ]);
            for ($j = 0; $j < 5; $j++) {
                app(AttachMedia::class)->photo(
                    $event,
                    UploadedFile::fake()->image("photo_{$i}_{$j}.jpg", 800, 600),
                    $this->user,
                );
            }
        }

        $response = $this->actingAs($this->user)
            ->get('/apps/our-history/gallery')
            ->assertStatus(200);

        $paginator = $response->inertiaProps('media');

        // Page 1 caps at the per-page limit (24)
        $this->assertCount(
            24,
            $paginator['data'],
            'Page 1 must contain exactly 24 items (perPage limit)',
        );

        // Paginator shape
        $this->assertSame(1, $paginator['current_page'], 'current_page must be 1 on initial load');
        $this->assertSame('newest-first', $response->inertiaProps('order'), "'order' defaults to newest-first");
        $this->assertNotNull($paginator['next_page_url'], 'next_page_url must not be null when there is a page 2');
        $this->assertSame(30, $paginator['total'], 'total must reflect the full dataset count (30)');

        // First item belongs to the newest event under default newest-first order
        $this->assertSame(
            $newestTitle,
            $paginator['data'][0]['event_title'] ?? null,
            'First media item on page 1 must belong to the newest event (newest-first default)',
        );
    }

    public function test_gallery_next_page_url_carries_active_filter(): void
    {
        // Seed 35 photos across 7 events (5 each) so the photos-filtered set  still has a page
        // 2 (35 > perPage=24).
        for ($i = 0; $i < 7; $i++) {
            $event = Event::factory()->create([
                'occurred_on' => "202{$i}-0{$i}-15",
                'creator_id' => $this->user->id,
            ]);
            // Handle year/month edge cases in date string for events 0-6
            $event->update(['occurred_on' => "202{$i}-01-15"]);
            for ($j = 0; $j < 5; $j++) {
                app(AttachMedia::class)->photo(
                    $event,
                    UploadedFile::fake()->image("p_{$i}_{$j}.jpg", 800, 600),
                    $this->user,
                );
            }
        }

        $response = $this->actingAs($this->user)
            ->get('/apps/our-history/gallery?type=photos')
            ->assertStatus(200);

        $paginator = $response->inertiaProps('media');

        $nextUrl = $paginator['next_page_url'] ?? null;
        $this->assertNotNull($nextUrl, 'next_page_url must not be null when filtered set spans 2+ pages');
        $this->assertStringContainsString(
            'type=photos',
            $nextUrl,
            'next_page_url must carry type=photos so infinite scroll loads the filtered page 2 (withQueryString guard)',
        );
    }
}
