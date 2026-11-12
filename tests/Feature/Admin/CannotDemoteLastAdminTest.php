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
}
