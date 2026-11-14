<?php

namespace Tests\Feature\Admin;

use App\Shell\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UsersEditTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    public function test_admin_can_view_edit_form(): void
    {
        $admin = User::factory()->admin()->create();
        $target = User::factory()->create();

        $response = $this->actingAs($admin)
            ->get(route('admin.users.edit', ['user' => $target->id]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->component('Shell/Pages/Admin/UsersEdit'));
    }

    public function test_admin_can_promote_user_to_admin(): void
    {
        $admin = User::factory()->admin()->create();
        $target = User::factory()->create();

        $response = $this->actingAs($admin)
            ->patch(route('admin.users.update', ['user' => $target->id]), [
                'role' => 'admin',
            ]);

        $response->assertRedirect(route('admin.users.index'));
        $this->assertTrue($target->fresh()->hasRole('admin'));
    }

    public function test_admin_can_demote_admin_when_not_last(): void
    {
        $admin1 = User::factory()->admin()->create();
        $admin2 = User::factory()->admin()->create();

        $response = $this->actingAs($admin1)
            ->patch(route('admin.users.update', ['user' => $admin2->id]), [
                'role' => 'user',
            ]);

        $response->assertRedirect(route('admin.users.index'));
        $response->assertSessionMissing('errors');
        $this->assertFalse($admin2->fresh()->hasRole('admin'));
        $this->assertTrue($admin2->fresh()->hasRole('user'));
    }
}
