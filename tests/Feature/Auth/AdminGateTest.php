<?php

namespace Tests\Feature\Auth;

use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Tests\TestCase;

class AdminGateTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RoleSeeder::class);
    }

    public function test_admin_user_passes_admin_gate(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $this->assertTrue(Gate::forUser($admin)->allows('admin'));
    }

    public function test_non_admin_user_fails_admin_gate(): void
    {
        $user = User::factory()->create();

        $this->assertFalse(Gate::forUser($user)->allows('admin'));
    }
}
