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

class GalleryAvailableYearsTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        // Fake the bucket so AttachMedia + SignedUrls don't hit a real disk.
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

    private function photoEvent(string $occurredOn): Event
    {
        $event = Event::factory()->create([
            'occurred_on' => $occurredOn,
            'creator_id' => $this->user->id,
        ]);
        app(AttachMedia::class)->photo(
            $event,
            UploadedFile::fake()->image('p_'.$event->id.'.jpg', 800, 600),
            $this->user,
        );

        return $event;
    }

    private function videoEvent(string $occurredOn): Event
    {
        $event = Event::factory()->create([
            'occurred_on' => $occurredOn,
            'creator_id' => $this->user->id,
        ]);
        app(AttachMedia::class)->video(
            $event,
            UploadedFile::fake()->create('v_'.$event->id.'.mp4', 100, 'video/mp4'),
            null,
            $this->user,
        );

        return $event;
    }

    public function test_available_years_is_distinct_descending(): void
    {
        $this->photoEvent('2021-03-10');
        $this->photoEvent('2024-06-15');
        $this->photoEvent('2024-09-01'); // duplicate year
        $this->photoEvent('2026-01-20');
        // A year whose only moment has no media stays off the rail.
        Event::factory()->create(['occurred_on' => '2020-02-10', 'creator_id' => $this->user->id]);

        $years = $this->actingAs($this->user)
            ->get('/apps/our-history/gallery')
            ->assertStatus(200)
            ->inertiaProps('available_years');

        $this->assertSame([2026, 2024, 2021], $years);
    }

    public function test_type_filter_narrows_available_years(): void
    {
        $this->photoEvent('2022-05-05');   // photo-only year
        $this->videoEvent('2025-07-07');   // video-only year

        $photoYears = $this->actingAs($this->user)
            ->get('/apps/our-history/gallery?type=photos')
            ->assertStatus(200)
            ->inertiaProps('available_years');
        $this->assertSame([2022], $photoYears, 'photos filter must show only the photo year');

        $videoYears = $this->actingAs($this->user)
            ->get('/apps/our-history/gallery?type=videos')
            ->assertStatus(200)
            ->inertiaProps('available_years');
        $this->assertSame([2025], $videoYears, 'videos filter must show only the video year');

        $allYears = $this->actingAs($this->user)
            ->get('/apps/our-history/gallery?type=all')
            ->assertStatus(200)
            ->inertiaProps('available_years');
        $this->assertSame([2025, 2022], $allYears, 'all (default) must show both years descending');
    }

    public function test_soft_deleted_event_year_excluded(): void
    {
        $this->photoEvent('2023-04-04');
        $trashed = $this->photoEvent('2019-08-08');
        $trashed->delete(); // soft-delete

        $years = $this->actingAs($this->user)
            ->get('/apps/our-history/gallery')
            ->assertStatus(200)
            ->inertiaProps('available_years');

        $this->assertSame([2023], $years);
        $this->assertNotContains(2019, $years, 'soft-deleted event year must be excluded');
    }

    public function test_year_filter_does_not_collapse_available_years(): void
    {
        $this->photoEvent('2020-02-02');
        $this->photoEvent('2024-12-12');

        $years = $this->actingAs($this->user)
            ->get('/apps/our-history/gallery?year=2020')
            ->assertStatus(200)
            ->inertiaProps('available_years');

        $this->assertSame([2024, 2020], $years, '?year= must not collapse the rail');
    }
}
