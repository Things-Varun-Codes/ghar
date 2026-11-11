<?php

namespace Tests\Feature\Auth;

use App\Shell\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LastLoginAtTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    public function test_last_login_at_is_updated_on_successful_login(): void
    {
        $user = User::factory()->create(['last_login_at' => null]);

        $this->assertNull($user->last_login_at);

        $this->post(route('login.store'), [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertNotNull($user->fresh()->last_login_at);
    }

    public function test_last_login_at_is_not_updated_on_failed_login(): void
    {
        $user = User::factory()->create(['last_login_at' => null]);

        $this->post(route('login.store'), [
            'email' => $user->email,
            'password' => 'wrong-password',
        ]);

        $this->assertNull($user->fresh()->last_login_at);
    }

    public function test_last_login_at_is_updated_each_login(): void
    {
        $user = User::factory()->create(['last_login_at' => now()->subDay()]);
        $oldTimestamp = $user->last_login_at;

        $this->travel(1)->hour();

        $this->post(route('login.store'), [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertTrue($user->fresh()->last_login_at->isAfter($oldTimestamp));
    }
}
