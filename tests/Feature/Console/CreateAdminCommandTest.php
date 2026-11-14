<?php

namespace Tests\Feature\Console;

use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CreateAdminCommandTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RoleSeeder::class);
    }

    public function test_creates_admin_user_with_provided_password(): void
    {
        $this->artisan('ghar:create-admin', [
            'email' => 'admin@example.com',
            'name' => 'Admin User',
            '--password' => 'supersecretpassword',
        ])
            ->assertSuccessful()
            ->assertExitCode(0);

        $user = User::where('email', 'admin@example.com')->firstOrFail();
        $this->assertTrue($user->hasRole('admin'));
        $this->assertNotNull($user->email_verified_at);
    }

    public function test_generates_password_when_omitted(): void
    {
        $this->artisan('ghar:create-admin', [
            'email' => 'admin@example.com',
            'name' => 'Admin User',
        ])
            ->assertSuccessful()
            ->expectsOutputToContain('Generated password:');
    }

    public function test_aborts_when_admin_already_exists(): void
    {
        // Create first admin.
        $this->artisan('ghar:create-admin', [
            'email' => 'first@example.com',
            'name' => 'First Admin',
            '--password' => 'password1',
        ])->assertSuccessful();

        // Second invocation must fail.
        $this->artisan('ghar:create-admin', [
            'email' => 'second@example.com',
            'name' => 'Second Admin',
            '--password' => 'password2',
        ])->assertFailed();

        // No second admin account was created.
        $this->assertNull(User::where('email', 'second@example.com')->first());
    }

    public function test_if_none_succeeds_quietly_once_an_admin_exists(): void
    {
        $this->artisan('ghar:create-admin', [
            'email' => 'first@example.com',
            'name' => 'First Admin',
            '--if-none' => true,
        ])->assertSuccessful()->expectsOutputToContain('Generated password:');

        // The container entrypoint runs this on every start.
        $this->artisan('ghar:create-admin', [
            'email' => 'first@example.com',
            'name' => 'First Admin',
            '--if-none' => true,
        ])->assertSuccessful()->doesntExpectOutputToContain('Generated password:');

        $this->assertSame(1, User::role('admin')->count());
    }
}
