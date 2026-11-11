<?php

namespace Tests\Feature\Admin;

use App\Shell\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CannotDeleteLastAdminTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    public function test_cannot_delete_the_last_admin(): void
    {
        $admin = User::factory()->admin()->create();
        // No other admins — this is the last one.

        $response = $this->actingAs($admin)
            ->delete(route('admin.users.destroy', ['user' => $admin->id]));

        // Should redirect back with an error
        $response->assertRedirect(route('admin.users.index'));

        // Admin must still exist
        $this->assertDatabaseHas('users', ['id' => $admin->id]);
        // Admin role must also survive — guards must not silently strip the pivot
        $this->assertTrue($admin->fresh()->hasRole('admin'), 'Admin role must survive the blocked delete');
    }

    public function test_can_delete_non_last_admin(): void
    {
        $admin1 = User::factory()->admin()->create();
        $admin2 = User::factory()->admin()->create();

        // admin1 deletes admin2 — allowed (admin1 remains)
        $response = $this->actingAs($admin1)
            ->delete(route('admin.users.destroy', ['user' => $admin2->id]));

        $response->assertRedirect(route('admin.users.index'));
        $this->assertDatabaseMissing('users', ['id' => $admin2->id]);
    }

    public function test_admin_can_delete_regular_user(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create();

        $response = $this->actingAs($admin)
            ->delete(route('admin.users.destroy', ['user' => $user->id]));

        $response->assertRedirect(route('admin.users.index'));
        $this->assertDatabaseMissing('users', ['id' => $user->id]);
    }
}
