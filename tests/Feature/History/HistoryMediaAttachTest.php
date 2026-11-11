<?php

namespace Tests\Feature\History;

use App\MiniApps\History\Actions\AttachMedia;
use App\MiniApps\History\Actions\DetachMedia;
use App\MiniApps\History\Models\Event;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Tests\TestCase;

class HistoryMediaAttachTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Redirect all media writes to a local tmp disk keyed as 's3'
        Storage::fake('s3');
    }

    public function test_photo_attaches_with_conversions(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        /** @var Event $event */
        $event = Event::factory()->create(['creator_id' => $user->id]);

        $file = UploadedFile::fake()->image('photo.jpg', 800, 600);

        $response = $this->actingAs($user)->post(
            "/apps/our-history/events/{$event->id}/media",
            ['media' => $file],
        );

        $response->assertRedirect();
        $response->assertStatus(303);

        $event->refresh();
        $photos = $event->getMedia('photos');
        $this->assertCount(1, $photos);

        $media = $photos->first();
        $this->assertNotNull($media);

        // Conversions should have run synchronously (nonQueued +
        // queue_conversions_by_default=false)
        $this->assertTrue(
            Storage::disk('s3')->exists($media->getPathRelativeToRoot('thumb')),
            'thumb conversion missing on fake bucket disk',
        );
        $this->assertTrue(
            Storage::disk('s3')->exists($media->getPathRelativeToRoot('medium')),
            'medium conversion missing on fake bucket disk',
        );
    }

    public function test_photo_dimensions_observed(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        /** @var Event $event */
        $event = Event::factory()->create(['creator_id' => $user->id]);

        $file = UploadedFile::fake()->image('photo.jpg', 800, 600);

        $this->actingAs($user)->post(
            "/apps/our-history/events/{$event->id}/media",
            ['media' => $file],
        );

        $media = $event->fresh()->getMedia('photos')->first();
        $this->assertNotNull($media);

        // AttachMedia::photo() captures dimensions from getRealPath() before upload
        $this->assertEquals(800, $media->custom_properties['width'] ?? null);
        $this->assertEquals(600, $media->custom_properties['height'] ?? null);
    }

    public function test_video_attaches_poster_sibling(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        /** @var Event $event */
        $event = Event::factory()->create(['creator_id' => $user->id]);

        // Synthetic 5MB video and a small poster image
        $videoFile = UploadedFile::fake()->create('clip.mp4', 5_000, 'video/mp4');
        $posterFile = UploadedFile::fake()->image('poster.webp', 320, 240);

        $response = $this->actingAs($user)->post(
            "/apps/our-history/events/{$event->id}/media",
            ['media' => $videoFile, 'poster' => $posterFile],
        );

        $response->assertRedirect();
        $response->assertStatus(303);

        $event->refresh();
        $videos = $event->getMedia('videos');
        $posters = $event->getMedia('video-posters');

        $this->assertCount(1, $videos, 'video collection should have 1 item');
        $this->assertCount(1, $posters, 'video-posters collection should have 1 item');

        $videoMedia = $videos->first();
        $posterMedia = $posters->first();

        $this->assertEquals(
            $videoMedia->id,
            $posterMedia->custom_properties['for_media_id'] ?? null,
            'poster custom_properties.for_media_id must reference the video media id',
        );
    }

    public function test_video_over_100mb_rejected(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        /** @var Event $event */
        $event = Event::factory()->create(['creator_id' => $user->id]);

        // 150MB synthetic mp4 (note: UploadedFile::fake()->create size is in KB)
        $bigVideo = UploadedFile::fake()->create('big.mp4', 150_000, 'video/mp4');

        $response = $this->actingAs($user)->post(
            "/apps/our-history/events/{$event->id}/media",
            ['media' => $bigVideo],
        );

        $response->assertSessionHasErrors('media');

        // Nothing should have been stored
        $this->assertCount(0, $event->fresh()->getMedia('videos'));
    }

    public function test_svg_rejected(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        /** @var Event $event */
        $event = Event::factory()->create(['creator_id' => $user->id]);

        $svgFile = UploadedFile::fake()->create('payload.svg', 5, 'image/svg+xml');

        $response = $this->actingAs($user)->post(
            "/apps/our-history/events/{$event->id}/media",
            ['media' => $svgFile],
        );

        $response->assertSessionHasErrors('media');

        // SVG must be rejected — no photos collection row created
        $this->assertCount(0, $event->fresh()->getMedia('photos'));
    }

    public function test_media_detach_deletes_db_row(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        /** @var Event $event */
        $event = Event::factory()->create(['creator_id' => $user->id]);

        // Attach a photo first
        $file = UploadedFile::fake()->image('photo.jpg', 400, 300);
        $this->actingAs($user)->post(
            "/apps/our-history/events/{$event->id}/media",
            ['media' => $file],
        );

        $media = $event->fresh()->getMedia('photos')->first();
        $this->assertNotNull($media, 'photo should have attached');

        $mediaId = $media->id;

        $action = $this->app->make(DetachMedia::class);
        $action($event, $media, $user);

        // DB row must be gone
        $this->assertNull(
            Media::find($mediaId),
            'Media DB row should be deleted after DetachMedia',
        );
    }

    public function test_media_destroy_rejects_cross_event_id(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        /** @var Event $eventA */
        $eventA = Event::factory()->create(['creator_id' => $user->id]);
        /** @var Event $eventB */
        $eventB = Event::factory()->create(['creator_id' => $user->id]);

        // Attach a photo to event B
        $this->actingAs($user)->post(
            "/apps/our-history/events/{$eventB->id}/media",
            ['media' => UploadedFile::fake()->image('b.jpg', 400, 300)],
        );
        $mediaB = $eventB->fresh()->getMedia('photos')->first();
        $this->assertNotNull($mediaB);

        // Attempt to delete media B via event A's URL — must 404
        $response = $this->actingAs($user)->delete(
            "/apps/our-history/events/{$eventA->id}/media/{$mediaB->id}",
        );

        $response->assertStatus(404);

        // Media must still be present
        $this->assertNotNull(
            Media::find($mediaB->id),
            'Cross-event detach attempt must not delete the media row',
        );
    }
}
