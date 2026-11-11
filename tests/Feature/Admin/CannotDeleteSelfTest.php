<?php

namespace Tests\Feature\Admin;

use App\Shell\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CannotDeleteSelfTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    public function test_admin_cannot_delete_their_own_account(): void
    {
        // Two admins so the last-admin guard doesn't trigger
        $admin1 = User::factory()->admin()->create();
        $admin2 = User::factory()->admin()->create();

        $response = $this->actingAs($admin1)
            ->delete(route('admin.users.destroy', ['user' => $admin1->id]));

        // Should redirect with an error, not 200 or 403
        $response->assertRedirect(route('admin.users.index'));

        // admin1 must still exist
        $this->assertDatabaseHas('users', ['id' => $admin1->id]);
        // admin1's role must also survive — guards must not silently strip the pivot
        $this->assertTrue($admin1->fresh()->hasRole('admin'), 'Admin role must survive the blocked self-delete');
    }
}
