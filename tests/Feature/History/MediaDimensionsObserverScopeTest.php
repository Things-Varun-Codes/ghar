<?php

namespace Tests\Feature\History;

use App\MiniApps\History\Models\Event;
use App\MiniApps\History\Observers\MediaDimensionsObserver;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Tests\TestCase;

class MediaDimensionsObserverScopeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Local-style fake disk so the observer's `localDisks` guard (local disk only)
        // passes and getPath() yields a real filesystem  path Image::load() can read.
        Storage::fake('local');
    }

    public function test_observer_fires_for_history_photos_collection(): void
    {
        $media = $this->seedMediaOnDisk(collection: 'photos', width: 640, height: 480);

        (new MediaDimensionsObserver)->created($media);

        $this->assertSame(640, $media->custom_properties['width'] ?? null);
        $this->assertSame(480, $media->custom_properties['height'] ?? null);
    }

    public function test_observer_fires_for_history_videos_collection(): void
    {
        $media = $this->seedMediaOnDisk(collection: 'videos', width: 320, height: 180);

        (new MediaDimensionsObserver)->created($media);

        $this->assertSame(320, $media->custom_properties['width'] ?? null);
        $this->assertSame(180, $media->custom_properties['height'] ?? null);
    }

    public function test_observer_fires_for_history_video_posters_collection(): void
    {
        $media = $this->seedMediaOnDisk(collection: 'video-posters', width: 240, height: 180);

        (new MediaDimensionsObserver)->created($media);

        $this->assertSame(240, $media->custom_properties['width'] ?? null);
        $this->assertSame(180, $media->custom_properties['height'] ?? null);
    }

    public function test_observer_no_ops_for_unknown_collection(): void
    {
        $media = $this->seedMediaOnDisk(collection: 'corner-some-future', width: 800, height: 600);

        (new MediaDimensionsObserver)->created($media);

        $this->assertArrayNotHasKey(
            'width',
            $media->custom_properties ?? [],
            'observer should no-op on non-History collections — collection_name gate',
        );
        $this->assertArrayNotHasKey(
            'height',
            $media->custom_properties ?? [],
            'observer should no-op on non-History collections — collection_name gate',
        );
    }

    private function seedMediaOnDisk(string $collection, int $width, int $height): Media
    {
        /** @var User $user */
        $user = User::factory()->create();
        /** @var Event $event */
        $event = Event::factory()->create(['creator_id' => $user->id]);

        $fileName = "probe-{$collection}-{$width}x{$height}.jpg";
        $uploaded = UploadedFile::fake()->image($fileName, $width, $height);

        /** @var Media $media */
        $media = new Media;
        $media->model_type = Event::class;
        $media->model_id = $event->id;
        $media->uuid = (string) Str::uuid();
        $media->collection_name = $collection;
        $media->name = $fileName;
        $media->file_name = $fileName;
        $media->mime_type = 'image/jpeg';
        $media->disk = 'local';
        $media->conversions_disk = 'local';
        $media->size = (int) $uploaded->getSize();
        $media->manipulations = [];
        $media->custom_properties = [];
        $media->generated_conversions = [];
        $media->responsive_images = [];
        $media->order_column = 1;
        $media->saveQuietly();

        // Place the real image where the default path generator looks for it  ({media
        // id}/{file name}); the id is only known after the insert.
        Storage::disk('local')->putFileAs((string) $media->id, $uploaded, $fileName);

        // Sanity check: the file the observer will load actually exists.
        $this->assertTrue(
            file_exists($media->getPath()),
            "expected fake-disk file at {$media->getPath()}",
        );

        return $media;
    }
}
