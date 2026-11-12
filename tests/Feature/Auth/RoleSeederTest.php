<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RoleSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_role_seeder_creates_each_web_role_exactly_once(): void
    {
        // Running twice must not throw or produce duplicate rows.
        $this->seed(\Database\Seeders\RoleSeeder::class);
        $this->seed(\Database\Seeders\RoleSeeder::class);

        $this->assertSame(1, Role::where(['name' => 'admin', 'guard_name' => 'web'])->count());
        $this->assertSame(1, Role::where(['name' => 'user', 'guard_name' => 'web'])->count());
        $this->assertSame(2, Role::count());
    }
}
