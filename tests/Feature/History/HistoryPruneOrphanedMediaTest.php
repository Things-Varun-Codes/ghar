<?php

namespace Tests\Feature\History;

use App\MiniApps\History\Actions\AttachMedia;
use App\MiniApps\History\Models\Event;
use App\MiniApps\History\Models\EventChange;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Tests\TestCase;

class HistoryPruneOrphanedMediaTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('s3');
        $this->user = User::factory()->create();
    }

    public function test_prune_keeps_events_within_window(): void
    {
        $event = Event::factory()->create(['creator_id' => $this->user->id]);
        $eventId = $event->id;

        // Soft-delete now (well within the 30-day window)
        $event->delete();
        $this->assertNotNull(Event::onlyTrashed()->find($eventId), 'Event should be soft-deleted');

        Artisan::call('history:prune-media');

        // Event must still exist as soft-deleted (NOT hard-deleted)
        $this->assertNotNull(
            Event::onlyTrashed()->find($eventId),
            'Prune should not touch events soft-deleted within the retention window',
        );
    }

    public function test_prune_removes_events_past_window(): void
    {
        $event = Event::factory()->create(['creator_id' => $this->user->id]);

        // Attach a photo so we have a media row + file on the fake disk
        $photo = UploadedFile::fake()->image('old.jpg', 800, 600);
        app(AttachMedia::class)->photo($event, $photo, $this->user);

        $event->refresh();
        $media = $event->getMedia('photos')->first();
        $this->assertNotNull($media, 'Photo should have attached');
        $mediaId = $media->id;

        // Record the bucket path before deletion
        $storedPath = $media->getPathRelativeToRoot();

        // Soft-delete the event
        $event->delete();
        $eventId = $event->id;

        // Wind back the soft-delete timestamp to 35 days ago (past the 30-day window)
        Event::withTrashed()->where('id', $eventId)->update([
            'deleted_at' => now()->subDays(35),
        ]);

        Artisan::call('history:prune-media');

        // Event hard-deleted — withTrashed() should return null
        $this->assertNull(
            Event::withTrashed()->find($eventId),
            'Event should be hard-deleted after prune',
        );

        // Media DB row deleted
        $this->assertNull(
            Media::find($mediaId),
            'Media row should be deleted after prune',
        );

        // Bucket binary deleted (medialibrary's observer calls removeAllFiles on fake disk)
        Storage::disk('s3')->assertMissing($storedPath);
    }

    public function test_prune_preserves_activity_log(): void
    {
        $event = Event::factory()->create(['creator_id' => $this->user->id]);

        // Create an activity-log entry
        /** @var EventChange $change */
        $change = $event->changes()->create([
            'user_id' => $this->user->id,
            'action' => 'create',
            'summary' => 'Created event',
            'changes' => null,
            'created_at' => now(),
        ]);
        $changeId = $change->id;

        // Soft-delete the event and back-date past 30 days
        $event->delete();
        Event::withTrashed()->where('id', $event->id)->update([
            'deleted_at' => now()->subDays(35),
        ]);

        Artisan::call('history:prune-media');

        // Event must be hard-deleted
        $this->assertNull(Event::withTrashed()->find($event->id), 'Event should be hard-deleted');

        // EventChange row must survive (FK no cascade, retained forever)
        $this->assertNotNull(
            EventChange::find($changeId),
            'EventChange row must survive event prune (audit log retained forever)',
        );
    }

    public function test_dry_run_does_not_act(): void
    {
        $event = Event::factory()->create(['creator_id' => $this->user->id]);
        $photo = UploadedFile::fake()->image('retain.jpg', 640, 480);
        app(AttachMedia::class)->photo($event, $photo, $this->user);

        $event->refresh();
        $media = $event->getMedia('photos')->first();
        $this->assertNotNull($media);
        $mediaId = $media->id;
        $eventId = $event->id;

        // Soft-delete and back-date past 30 days
        $event->delete();
        Event::withTrashed()->where('id', $eventId)->update([
            'deleted_at' => now()->subDays(35),
        ]);

        // Run in dry-run mode
        $exitCode = Artisan::call('history:prune-media', ['--dry-run' => true]);
        $this->assertSame(0, $exitCode, 'Dry-run should exit cleanly');

        // Event must still exist as soft-deleted
        $this->assertNotNull(
            Event::onlyTrashed()->find($eventId),
            'Dry-run must not hard-delete the event',
        );

        // Media row must still exist
        $this->assertNotNull(
            Media::find($mediaId),
            'Dry-run must not delete media rows',
        );
    }
}
