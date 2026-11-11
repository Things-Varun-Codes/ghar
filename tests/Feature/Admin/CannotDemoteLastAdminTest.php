<?php

namespace Tests\Feature\Admin;

use App\Shell\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CannotDemoteLastAdminTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    public function test_cannot_demote_the_last_admin(): void
    {
        $admin = User::factory()->admin()->create();
        // No other admins — this is the last one.

        $response = $this->actingAs($admin)
            ->patch(route('admin.users.update', ['user' => $admin->id]), [
                'role' => 'user',
            ]);

        // Should redirect with an error (not succeed)
        $response->assertRedirect(route('admin.users.index'));
        $response->assertSessionHasErrors(['role']);

        // Admin must still have the admin role
        $this->assertTrue($admin->fresh()->hasRole('admin'));
        $this->assertFalse($admin->fresh()->hasRole('user'));
    }

    public function test_admin_count_stays_at_least_one_after_attempted_demotion(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->patch(route('admin.users.update', ['user' => $admin->id]), [
                'role' => 'user',
            ]);

        $this->assertGreaterThanOrEqual(1, User::role('admin')->count());
    }

    public function test_can_demote_when_another_admin_exists(): void
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
    }
}
