<?php

namespace Tests\Feature\Settings;

use App\Shell\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PasswordChangeRequiresCurrentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    public function test_password_page_renders(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('settings.password.show'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->component('Shell/Pages/Settings/Password'));
    }

    public function test_user_can_change_password_with_correct_current(): void
    {
        $user = User::factory()->create(['password' => Hash::make('OldPassword1!')]);

        $response = $this->actingAs($user)
            ->put(route('settings.password.update'), [
                'current_password' => 'OldPassword1!',
                'password' => 'NewPassword2!',
                'password_confirmation' => 'NewPassword2!',
            ]);

        $response->assertRedirect(route('settings.password.show'));
        $this->assertTrue(Hash::check('NewPassword2!', $user->fresh()->password));
    }

    public function test_incorrect_current_password_is_rejected(): void
    {
        $user = User::factory()->create(['password' => Hash::make('OldPassword1!')]);

        $response = $this->actingAs($user)
            ->put(route('settings.password.update'), [
                'current_password' => 'WrongPassword!',
                'password' => 'NewPassword2!',
                'password_confirmation' => 'NewPassword2!',
            ]);

        $response->assertSessionHasErrors(['current_password']);
        // Password must NOT have changed
        $this->assertFalse(Hash::check('NewPassword2!', $user->fresh()->password));
        $this->assertTrue(Hash::check('OldPassword1!', $user->fresh()->password));
    }

    public function test_new_password_confirmation_required(): void
    {
        $user = User::factory()->create(['password' => Hash::make('OldPassword1!')]);

        $response = $this->actingAs($user)
            ->put(route('settings.password.update'), [
                'current_password' => 'OldPassword1!',
                'password' => 'NewPassword2!',
                'password_confirmation' => 'Mismatch!',
            ]);

        $response->assertSessionHasErrors(['password']);
    }

    public function test_guest_cannot_change_password(): void
    {
        $response = $this->put(route('settings.password.update'), [
            'current_password' => 'any',
            'password' => 'new',
            'password_confirmation' => 'new',
        ]);

        $response->assertRedirect(route('login'));
    }
}
