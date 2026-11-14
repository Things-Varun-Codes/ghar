<?php

namespace Tests\Feature\History;

use App\MiniApps\History\Actions\AttachMedia;
use App\MiniApps\History\Models\Event;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Tests\TestCase;

class HistoryCascadeDeleteTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // All media writes redirect to a local tmp disk keyed as 's3'.
        Storage::fake('s3');
    }

    public function test_force_delete_removes_media_rows_and_files(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        /** @var Event $event */
        $event = Event::factory()->create(['creator_id' => $user->id]);

        $photo = UploadedFile::fake()->image('photo.jpg', 800, 600);
        app(AttachMedia::class)->photo($event, $photo, $user);

        $media = $event->fresh()->getMedia('photos')->first();
        $this->assertNotNull($media, 'photo should have attached');

        $mediaId = $media->id;
        $mediaPath = $media->getPathRelativeToRoot();

        // Pre-condition: binary exists on the fake bucket disk.
        Storage::disk('s3')->assertExists($mediaPath);

        // Hard-delete the event.
        $event->forceDelete();

        $this->assertDatabaseMissing('media', ['id' => $mediaId]);
        Storage::disk('s3')->assertMissing($mediaPath);
        // Defensive: Media::find returns null on the orphaned id.
        $this->assertNull(Media::find($mediaId));
    }

    public function test_gallery_media_and_counters_exclude_soft_deleted_events(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        /** @var Event $eventKept */
        $eventKept = Event::factory()->create(['creator_id' => $user->id]);
        app(AttachMedia::class)->photo(
            $eventKept,
            UploadedFile::fake()->image('kept.jpg', 800, 600),
            $user,
        );

        /** @var Event $eventTrashed */
        $eventTrashed = Event::factory()->create(['creator_id' => $user->id]);
        app(AttachMedia::class)->photo(
            $eventTrashed,
            UploadedFile::fake()->image('trashed.jpg', 800, 600),
            $user,
        );

        $eventTrashed->delete();

        $response = $this->actingAs($user)
            ->get('/apps/our-history/gallery')
            ->assertStatus(200);

        $this->assertCount(
            1,
            $response->inertiaProps('media')['data'],
            'Gallery media MUST exclude items from soft-deleted events (cascade contract).',
        );
        $this->assertSame(
            1,
            $response->inertiaProps('counts.photos'),
            'counts.photos must exclude photos of soft-deleted events.',
        );
        $this->assertSame(
            0,
            $response->inertiaProps('counts.videos'),
            'counts.videos must be 0 — no videos attached in this fixture.',
        );
        $this->assertSame(
            1,
            $response->inertiaProps('counts.events'),
            'counts.events must reflect the count of NON-soft-deleted events only.',
        );
    }
}
