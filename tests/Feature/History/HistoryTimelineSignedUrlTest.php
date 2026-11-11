<?php

namespace Tests\Feature\History;

use App\MiniApps\History\Actions\AttachMedia;
use App\MiniApps\History\Models\Event;
use App\Shell\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class HistoryTimelineSignedUrlTest extends TestCase
{
    use RefreshDatabase;

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
    }

    public function test_inertia_props_contain_signed_urls(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        /** @var Event $event */
        $event = Event::factory()->create(['creator_id' => $user->id]);

        // Attach a photo so the media array is non-empty.
        $file = UploadedFile::fake()->image('photo.jpg', 800, 600);
        app(AttachMedia::class)->photo($event, $file, $user);

        $response = $this->actingAs($user)
            ->get('/apps/our-history')
            ->assertStatus(200);

        $eventsData = $response->inertiaProps('events.data');
        $this->assertNotEmpty($eventsData, 'Expected at least one event in Inertia props');

        $firstEvent = $eventsData[0];
        $this->assertNotEmpty($firstEvent['media'], 'Expected media array to be non-empty');

        $originalUrl = $firstEvent['media'][0]['original'] ?? null;
        $this->assertNotNull($originalUrl, 'Expected original URL to be present in media payload');

        // Signed URL must be an https URL, not a bare storage path.
        $this->assertStringStartsWith('https://', $originalUrl, 'media.original must be a full signed URL');

        // Fake signed URL contains our fake X-Amz query params.
        $this->assertStringContainsString('X-Amz-', $originalUrl, 'media.original must contain signed URL query params');
    }

    public function test_signed_urls_not_persisted_to_db(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        /** @var Event $event */
        $event = Event::factory()->create(['creator_id' => $user->id]);

        $file = UploadedFile::fake()->image('photo.jpg', 800, 600);
        app(AttachMedia::class)->photo($event, $file, $user);

        // Render the timeline page (mints signed URLs into Inertia props).
        $this->actingAs($user)->get('/apps/our-history')->assertStatus(200);

        // Examine every column in the media table for signed URL leakage.
        $allMedia = DB::table('media')->get();
        foreach ($allMedia as $row) {
            $json = json_encode($row);
            $this->assertStringNotContainsString('X-Amz', $json, 'Signed URL found in media row (signed-URL contract violation)');
            $this->assertStringNotContainsString('fake-bucket.example.com', $json, 'Signed URL base found in media row');
        }

        // The our_history_events table also must not contain signed URLs.
        $eventsJson = json_encode(DB::table('our_history_events')->get()->toArray());
        $this->assertStringNotContainsString('X-Amz', $eventsJson, 'Signed URL found in events table (signed-URL contract violation)');
    }

    public function test_signed_urls_freshly_minted_on_render(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        /** @var Event $event */
        $event = Event::factory()->create(['creator_id' => $user->id]);

        $file = UploadedFile::fake()->image('photo.jpg', 800, 600);
        app(AttachMedia::class)->photo($event, $file, $user);

        // First render.
        $response1 = $this->actingAs($user)->get('/apps/our-history');
        $eventsData1 = $response1->inertiaProps('events.data');
        $url1 = $eventsData1[0]['media'][0]['original'] ?? null;
        $this->assertNotNull($url1, 'First render must produce a media URL');

        // Advance time by 65 minutes (past the 60-minute TTL).
        Carbon::setTestNow(now()->addMinutes(65));

        // Second render — Carbon::now() is now 65 min ahead, so the expiry timestamp
        // changes.
        $response2 = $this->actingAs($user)->get('/apps/our-history');
        $eventsData2 = $response2->inertiaProps('events.data');
        $url2 = $eventsData2[0]['media'][0]['original'] ?? null;
        $this->assertNotNull($url2, 'Second render must produce a media URL');

        // The two URLs must differ — the expiry timestamp embedded by our fake callback
        // changes.
        $this->assertNotEquals($url1, $url2, 'Signed URLs must differ across renders when time advances (per-request minting)');

        // Reset Carbon.
        Carbon::setTestNow();
    }

    public function test_media_payload_exposes_pending_until_conversions_generated(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        /** @var Event $event */
        $event = Event::factory()->create(['creator_id' => $user->id]);

        Queue::fake();

        $file = UploadedFile::fake()->image('photo.jpg', 800, 600);
        app(AttachMedia::class)->photo($event, $file, $user);

        // Before the queued conversions have generated, the photo reports pending=true  with
        // null thumb/medium.
        $media = $this->actingAs($user)->get('/apps/our-history')
            ->assertStatus(200)
            ->inertiaProps('events.data')[0]['media'][0];

        $this->assertArrayHasKey('pending', $media);
        $this->assertTrue($media['pending'], 'Photo with no generated conversions must report pending=true');
        $this->assertNull($media['thumb']);
        $this->assertNull($media['medium']);

        // Simulate the queue worker finishing: mark the WebP conversions generated.
        $photoMedia = $event->getMedia('photos')->first();
        $photoMedia->generated_conversions = ['thumb' => true, 'medium' => true];
        $photoMedia->save();

        $media2 = $this->actingAs($user)->get('/apps/our-history')
            ->assertStatus(200)
            ->inertiaProps('events.data')[0]['media'][0];

        $this->assertFalse($media2['pending'], 'Photo with generated conversions must report pending=false');
        $this->assertNotNull($media2['thumb'], 'thumb URL must be minted once the conversion exists');
        $this->assertNotNull($media2['medium'], 'medium URL must be minted once the conversion exists');
    }
}
