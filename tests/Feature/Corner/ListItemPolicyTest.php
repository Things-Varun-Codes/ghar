<?php

namespace Tests\Feature\Corner;

use App\MiniApps\Corner\Models\Activity;
use App\MiniApps\Corner\Models\Movie;
use App\MiniApps\Corner\Models\Place;
use App\MiniApps\Corner\Models\Song;
use App\Shell\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ListItemPolicyTest extends TestCase
{
    use RefreshDatabase;

    private User $adder;

    private User $member;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        Http::fake([
            'youtube.com/oembed*' => Http::response(['title' => 'New Track', 'author_name' => 'Artist'], 200),
        ]);

        $this->adder = User::factory()->create();
        $this->member = User::factory()->create();
        $this->admin = User::factory()->admin()->create();
    }

    /**
     * @return array<string, array{0: class-string<Song|Movie|Activity|Place>, 1: string, 2: array<string, mixed>, 3: string}>
     */
    public static function lists(): array
    {
        return [
            'songs' => [Song::class, 'songs', ['url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'], 'song'],
            'movies' => [Movie::class, 'movies', ['title' => 'Edited'], 'movie'],
            'activities' => [Activity::class, 'activities', ['title' => 'Edited'], 'activity'],
            'places' => [Place::class, 'places', [
                'title' => 'Edited', 'place_id' => 'ChIJ-edited', 'lat' => 12.97, 'lng' => 77.59, 'address' => 'Somewhere',
            ], 'place'],
        ];
    }

    /**
     * @param  class-string<Song|Movie|Activity|Place>  $model
     * @param  array<string, mixed>  $update
     */
    #[DataProvider('lists')]
    public function test_a_member_who_did_not_add_it_can_toggle_done_but_not_edit_or_delete(string $model, string $slug, array $update, string $prop): void
    {
        $item = $model::factory()->create(['added_by_user_id' => $this->adder->id]);
        $url = "/apps/our-corner/{$slug}/{$item->id}";

        $this->actingAs($this->member)->from($url)->patch($url, $update)->assertForbidden();
        $this->actingAs($this->member)->from($url)->delete($url)->assertForbidden();
        $this->assertModelExists($item);

        $this->actingAs($this->member)->from($url)->patch("{$url}/toggle-done")->assertRedirect($url);
        $this->assertNotNull($item->fresh()->done_at);
        $this->assertSame($this->member->id, $item->fresh()->done_by_user_id);

        // Anyone may also take it back, and that clears who marked it.
        $this->actingAs($this->adder)->from($url)->patch("{$url}/toggle-done")->assertRedirect($url);
        $this->assertNull($item->fresh()->done_at);
        $this->assertNull($item->fresh()->done_by_user_id);

        $this->actingAs($this->member)
            ->get($url)
            ->assertInertia(fn ($page) => $page->where("{$prop}.can", ['update' => false, 'delete' => false]));
    }

    /**
     * @param  class-string<Song|Movie|Activity|Place>  $model
     * @param  array<string, mixed>  $update
     */
    #[DataProvider('lists')]
    public function test_an_admin_may_edit_and_delete_anyones_item(string $model, string $slug, array $update, string $prop): void
    {
        $item = $model::factory()->create(['added_by_user_id' => $this->adder->id]);
        $url = "/apps/our-corner/{$slug}/{$item->id}";

        $this->actingAs($this->admin)
            ->get("/apps/our-corner/{$slug}")
            ->assertInertia(fn ($page) => $page->where("{$slug}.data.0.can", ['update' => true, 'delete' => true]));

        $this->actingAs($this->admin)->from($url)->patch($url, $update)->assertRedirect($url);
        $this->actingAs($this->admin)->from($url)->delete($url)->assertRedirect($url);
        $this->assertModelMissing($item);
    }

    /**
     * @param  class-string<Song|Movie|Activity|Place>  $model
     * @param  array<string, mixed>  $update
     */
    #[DataProvider('lists')]
    public function test_the_adder_may_edit_and_delete_their_own_item(string $model, string $slug, array $update, string $prop): void
    {
        $item = $model::factory()->create(['added_by_user_id' => $this->adder->id]);
        $url = "/apps/our-corner/{$slug}/{$item->id}";

        $this->actingAs($this->adder)->from($url)->patch($url, $update)->assertRedirect($url);
        $this->actingAs($this->adder)->from($url)->delete($url)->assertRedirect($url);
        $this->assertModelMissing($item);
    }
}
