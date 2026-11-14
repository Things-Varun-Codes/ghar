<?php

namespace Tests\Feature\Admin;

use App\Shell\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Spatie\Permission\Events\RoleDetachedEvent;
use Tests\TestCase;

class CannotDemoteSelfTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    public function test_admin_cannot_change_their_own_role(): void
    {
        // Two admins so the last-admin path (BlockLastAdminDemotion listener)  is NOT what's
        // under test — we're proving the new controller-layer  self-id guard catches the 2+
        // admin self-demotion case.
        $admin1 = User::factory()->admin()->create();
        $admin2 = User::factory()->admin()->create();

        $response = $this->actingAs($admin1)
            ->patch(route('admin.users.update', ['user' => $admin1->id]), [
                'role' => 'user',
            ]);

        $response->assertRedirect(route('admin.users.index'));
        $response->assertSessionHasErrors(['role']);

        $this->assertTrue($admin1->fresh()->hasRole('admin'));
        $this->assertFalse($admin1->fresh()->hasRole('user'));
    }

    public function test_guard_fires_before_role_detached_listener(): void
    {
        $admin1 = User::factory()->admin()->create();
        $admin2 = User::factory()->admin()->create();

        Event::fake([RoleDetachedEvent::class]);

        $this->actingAs($admin1)
            ->patch(route('admin.users.update', ['user' => $admin1->id]), [
                'role' => 'user',
            ]);

        Event::assertNotDispatched(RoleDetachedEvent::class);
    }
}
