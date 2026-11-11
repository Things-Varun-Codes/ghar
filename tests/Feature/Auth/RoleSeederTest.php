<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RoleSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_role_seeder_creates_admin_role(): void
    {
        $this->seed(\Database\Seeders\RoleSeeder::class);

        $this->assertDatabaseHas('roles', ['name' => 'admin', 'guard_name' => 'web']);
    }

    public function test_role_seeder_creates_user_role(): void
    {
        $this->seed(\Database\Seeders\RoleSeeder::class);

        $this->assertDatabaseHas('roles', ['name' => 'user', 'guard_name' => 'web']);
    }

    public function test_role_seeder_is_idempotent(): void
    {
        // Running twice must not throw or produce duplicate rows.
        $this->seed(\Database\Seeders\RoleSeeder::class);
        $this->seed(\Database\Seeders\RoleSeeder::class);

        $this->assertSame(1, Role::where('name', 'admin')->count());
        $this->assertSame(1, Role::where('name', 'user')->count());
    }
}
