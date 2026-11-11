<?php

namespace Tests\Feature\History;

use App\MiniApps\History\Models\Event;
use App\Shell\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Tests\TestCase;

class EventPolicyTest extends TestCase
{
    use RefreshDatabase;

    private User $creator;

    private User $member;

    private User $admin;

    private Event $event;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('s3');
        $this->seed(RoleSeeder::class);

        $this->creator = User::factory()->create();
        $this->member = User::factory()->create();
        $this->admin = User::factory()->admin()->create();
        $this->event = Event::factory()->create(['creator_id' => $this->creator->id, 'title' => 'Beach day']);
    }

    private function attachPhoto(): Media
    {
        return $this->event->addMedia(UploadedFile::fake()->image('p.jpg', 40, 30))->toMediaCollection('photos');
    }

    public function test_a_member_who_did_not_write_it_gets_403_on_every_mutation(): void
    {
        $media = $this->attachPhoto();
        $base = "/apps/our-history/events/{$this->event->id}";

        $this->actingAs($this->member)->patch($base, ['occurred_on' => '2024-01-01', 'title' => 'Hijacked'])->assertForbidden();
        $this->actingAs($this->member)->delete($base)->assertForbidden();
        $this->actingAs($this->member)
            ->post("{$base}/media", ['media' => UploadedFile::fake()->image('x.jpg', 40, 30)])
            ->assertForbidden();
        $this->actingAs($this->member)->delete("{$base}/media/{$media->id}")->assertForbidden();

        $this->event->refresh();
        $this->assertSame('Beach day', $this->event->title);
        $this->assertNull($this->event->deleted_at);
        $this->assertCount(1, $this->event->getMedia('photos'));
    }

    public function test_the_creator_may_change_their_own_moment(): void
    {
        $this->assertCanMutate($this->creator);
    }

    public function test_an_admin_may_change_anyones_moment(): void
    {
        $this->assertCanMutate($this->admin);
    }

    public function test_everyone_sees_every_moment_with_the_right_permissions(): void
    {
        foreach ([[$this->member, false], [$this->creator, true], [$this->admin, true]] as [$viewer, $allowed]) {
            $this->actingAs($viewer)
                ->get('/apps/our-history')
                ->assertInertia(fn ($page) => $page
                    ->where('eventsCount', 1)
                    ->where('events.data.0.id', $this->event->id)
                    ->where('events.data.0.can', ['update' => $allowed, 'delete' => $allowed]));
        }
    }

    private function assertCanMutate(User $actor): void
    {
        $base = "/apps/our-history/events/{$this->event->id}";

        $this->actingAs($actor)
            ->patch($base, ['occurred_on' => '2024-01-01', 'title' => 'Renamed'])
            ->assertRedirect('/apps/our-history');
        $this->assertSame('Renamed', $this->event->fresh()->title);

        $this->actingAs($actor)
            ->post("{$base}/media", ['media' => UploadedFile::fake()->image('x.jpg', 40, 30)])
            ->assertStatus(303);
        $media = $this->event->fresh()->getMedia('photos')->first();
        $this->assertNotNull($media);

        $this->actingAs($actor)->delete("{$base}/media/{$media->id}")->assertStatus(303);
        $this->assertNull(Media::find($media->id));

        $this->actingAs($actor)->delete($base)->assertRedirect('/apps/our-history');
        $this->assertSoftDeleted($this->event);
    }
}
