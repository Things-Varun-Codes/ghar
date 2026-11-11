<?php

namespace Tests\Feature\History;

use App\MiniApps\History\Actions\AttachMedia;
use App\MiniApps\History\Models\Event;
use App\Shell\Models\User;
use Carbon\Carbon;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class GalleryYearFilterTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);

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
    }

    private function photoEvent(User $author, string $occurredOn): Event
    {
        $event = Event::factory()->create([
            'occurred_on' => $occurredOn,
            'creator_id' => $author->id,
        ]);
        app(AttachMedia::class)->photo(
            $event,
            UploadedFile::fake()->image('p_'.$event->id.'.jpg', 800, 600),
            $author,
        );

        return $event;
    }

    /** @return array<int> */
    private function mediaIds($response): array
    {
        return collect($response->inertiaProps('media.data'))->pluck('id')->all();
    }

    public function test_year_filter_includes_january_first_and_december_thirty_first(): void
    {
        $user = User::factory()->admin()->create();
        $targetYear = 2024;

        $jan1 = $this->photoEvent($user, "{$targetYear}-01-01");
        $midYear = $this->photoEvent($user, "{$targetYear}-06-15");
        $dec31 = $this->photoEvent($user, "{$targetYear}-12-31");
        $adjacentYear = $this->photoEvent($user, ($targetYear + 1).'-01-01');

        $response = $this->actingAs($user)
            ->get("/apps/our-history/gallery?year={$targetYear}")
            ->assertStatus(200);

        $response->assertInertia(fn ($page) => $page->has('media.data', 3));

        $ids = $this->mediaIds($response);

        $this->assertCount(3, $ids);
        foreach ([$jan1, $midYear, $dec31] as $event) {
            $mediaId = $event->fresh()->media()->first()->id;
            $this->assertContains($mediaId, $ids, 'in-year media (including Jan 1 and Dec 31) must be returned');
        }

        $adjacentMediaId = $adjacentYear->fresh()->media()->first()->id;
        $this->assertNotContains($adjacentMediaId, $ids, 'the adjacent-year item must not leak into the target year');
    }

    public function test_year_filter_excludes_adjacent_years(): void
    {
        $user = User::factory()->admin()->create();
        $targetYear = 2024;

        $target = $this->photoEvent($user, "{$targetYear}-06-15");
        $before = $this->photoEvent($user, ($targetYear - 1).'-06-15');
        $after = $this->photoEvent($user, ($targetYear + 1).'-06-15');

        $response = $this->actingAs($user)
            ->get("/apps/our-history/gallery?year={$targetYear}")
            ->assertStatus(200);

        $ids = $this->mediaIds($response);

        $this->assertContains($target->fresh()->media()->first()->id, $ids);
        $this->assertNotContains($before->fresh()->media()->first()->id, $ids, 'the prior-year neighbour must be excluded');
        $this->assertNotContains($after->fresh()->media()->first()->id, $ids, 'the following-year neighbour must be excluded');
    }

    public function test_unfiltered_gallery_still_returns_every_item(): void
    {
        $user = User::factory()->admin()->create();

        $this->photoEvent($user, '2023-06-15');
        $this->photoEvent($user, '2024-06-15');
        $this->photoEvent($user, '2025-06-15');

        $response = $this->actingAs($user)
            ->get('/apps/our-history/gallery')
            ->assertStatus(200);

        $response->assertInertia(fn ($page) => $page->has('media.data', 3));
    }
}
