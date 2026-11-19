<?php

namespace Tests\Feature\Rooms;

use App\Shell\Models\User;
use App\Shell\Services\Rooms;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminRoomsPageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    public function test_only_an_admin_can_see_or_change_rooms(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('admin.rooms.index'))->assertForbidden();
        $this->patch(route('admin.rooms.update', 'our-history'), ['enabled' => false])->assertForbidden();
        $this->assertTrue(app(Rooms::class)->isOn('our-history'));
    }

    public function test_the_page_lists_every_installed_room_with_the_options_a_room_registers(): void
    {
        $this->actingAs(User::factory()->admin()->create())
            ->get(route('admin.rooms.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Shell/Pages/Admin/Rooms')
                ->has('rooms', count(config('miniapps')))
                ->where('rooms', fn ($rooms) => collect($rooms)->firstWhere('slug', 'our-exchange')['options'] !== []
                    && collect($rooms)->firstWhere('slug', 'our-history')['options'] === [])
            );
    }

    public function test_an_admin_turns_a_room_off_and_on(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->patch(route('admin.rooms.update', 'our-shelf'), ['enabled' => false])
            ->assertRedirect(route('admin.rooms.index'));
        $this->assertDatabaseHas('room_settings', ['key' => 'our-shelf', 'enabled' => false]);

        app()->forgetScopedInstances();
        $this->get('/apps/our-shelf')->assertNotFound();

        $this->patch(route('admin.rooms.update', 'our-shelf'), ['enabled' => true]);
        app()->forgetScopedInstances();
        $this->get('/apps/our-shelf')->assertOk();
    }

    public function test_validation_and_unknown_targets(): void
    {
        $this->actingAs(User::factory()->admin()->create());

        $this->patch(route('admin.rooms.update', 'our-shelf'), [])->assertSessionHasErrors('enabled');
        $this->patch(route('admin.rooms.update', 'nope'), ['enabled' => true])->assertNotFound();
        $this->patch(route('admin.rooms.update', 'our-exchange'), ['enabled' => true, 'option' => 'nope'])->assertNotFound();
        $this->patch(route('admin.rooms.update', 'our-history'), ['enabled' => true, 'option' => 'messages'])->assertNotFound();
    }
}
