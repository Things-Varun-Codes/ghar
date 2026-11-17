<?php

namespace Tests\Feature\Corner;

use App\Shell\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Feature\Corner\Concerns\MakesCornerLists;
use Tests\TestCase;

class ListItemPolicyTest extends TestCase
{
    use MakesCornerLists;
    use RefreshDatabase;

    private User $adder;

    private User $member;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        $this->publicDns();
        Http::fake([
            'example.com/*' => Http::response('<html><head><title>New Track</title></head></html>', 200, ['Content-Type' => 'text/html']),
        ]);

        $this->adder = User::factory()->create();
        $this->member = User::factory()->create();
        $this->admin = User::factory()->admin()->create();
    }

    /** @return array<string, array{0: string, 1: array<string, mixed>}> */
    public static function lists(): array
    {
        return [
            'songs' => ['songs', ['url' => 'https://example.com/new-track']],
            'movies' => ['movies', ['title' => 'Edited']],
            'activities' => ['activities', ['title' => 'Edited']],
            'places' => ['places', ['title' => 'Edited', 'location' => '12.97, 77.59', 'address' => 'Somewhere']],
        ];
    }

    /** @param  array<string, mixed>  $update */
    #[DataProvider('lists')]
    public function test_a_member_who_did_not_add_it_can_toggle_done_but_not_edit_or_delete(string $slug, array $update): void
    {
        $list = $this->listCalled($slug);
        $item = $this->itemIn($list, $this->adder, ['title' => 'Original']);
        $page = "/apps/our-corner/{$list->slug}/{$item->id}";
        $url = "/apps/our-corner/items/{$item->id}";

        $this->actingAs($this->member)->from($page)->patch($url, $update)->assertForbidden();
        $this->actingAs($this->member)->from($page)->delete($url)->assertForbidden();
        $this->assertModelExists($item);
        $this->assertSame('Original', $item->fresh()->title);

        $this->actingAs($this->member)->from($page)->patch("{$url}/toggle-done")->assertRedirect($page);
        $this->assertNotNull($item->fresh()->done_at);
        $this->assertSame($this->member->id, $item->fresh()->done_by_user_id);

        // Anyone may also take it back, and that clears who marked it.
        $this->actingAs($this->adder)->from($page)->patch("{$url}/toggle-done")->assertRedirect($page);
        $this->assertNull($item->fresh()->done_at);
        $this->assertNull($item->fresh()->done_by_user_id);

        $this->actingAs($this->member)
            ->get($page)
            ->assertInertia(fn (AssertableInertia $p) => $p->where('item.can', ['update' => false, 'delete' => false]));
        $this->actingAs($this->member)
            ->get("/apps/our-corner/{$list->slug}")
            ->assertInertia(fn (AssertableInertia $p) => $p->where('items.data.0.can', ['update' => false, 'delete' => false]));
    }

    /** @param  array<string, mixed>  $update */
    #[DataProvider('lists')]
    public function test_an_admin_may_edit_and_delete_anyones_item(string $slug, array $update): void
    {
        $list = $this->listCalled($slug);
        $item = $this->itemIn($list, $this->adder);
        $page = "/apps/our-corner/{$list->slug}/{$item->id}";
        $url = "/apps/our-corner/items/{$item->id}";

        $this->actingAs($this->admin)
            ->get("/apps/our-corner/{$list->slug}")
            ->assertInertia(fn (AssertableInertia $p) => $p->where('items.data.0.can', ['update' => true, 'delete' => true]));

        $this->actingAs($this->admin)->from($page)->patch($url, $update)->assertRedirect($page);
        $this->assertSame($this->adder->id, $item->fresh()->added_by_user_id);
        $this->actingAs($this->admin)->from($page)->delete($url)->assertRedirect($page);
        $this->assertModelMissing($item);
    }

    /** @param  array<string, mixed>  $update */
    #[DataProvider('lists')]
    public function test_the_adder_may_edit_and_delete_their_own_item(string $slug, array $update): void
    {
        $list = $this->listCalled($slug);
        $item = $this->itemIn($list, $this->adder);
        $page = "/apps/our-corner/{$list->slug}/{$item->id}";
        $url = "/apps/our-corner/items/{$item->id}";

        $this->actingAs($this->adder)
            ->get($page)
            ->assertInertia(fn (AssertableInertia $p) => $p->where('item.can', ['update' => true, 'delete' => true]));

        $this->actingAs($this->adder)->from($page)->patch($url, $update)->assertRedirect($page);
        $this->actingAs($this->adder)->from($page)->delete($url)->assertRedirect($page);
        $this->assertModelMissing($item);
    }

    public function test_toggling_an_item_that_does_not_exist_is_a_404(): void
    {
        $this->actingAs($this->member)->patch('/apps/our-corner/items/999999999/toggle-done')->assertNotFound();
        $this->actingAs($this->admin)->delete('/apps/our-corner/items/999999999')->assertNotFound();
    }
}
