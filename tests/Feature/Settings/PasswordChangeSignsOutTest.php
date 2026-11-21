<?php

namespace Tests\Feature\Settings;

use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordChangeSignsOutTest extends TestCase
{
    use RefreshDatabase;

    /** A session another device holds, from before the password changed. */
    private function otherDevice(User $user, string $oldHash): static
    {
        return $this->actingAs($user)->withSession([
            'password_hash_web' => Auth::guard('web')->hashPasswordForCookie($oldHash),
        ]);
    }

    private function changePassword(User $user): void
    {
        $this->actingAs($user)->put(route('settings.password.update'), [
            'current_password' => 'OldPassword1!',
            'password' => 'NewPassword2!',
            'password_confirmation' => 'NewPassword2!',
        ])->assertRedirect(route('settings.password.show'));
    }

    public function test_a_new_password_signs_out_other_devices_and_keeps_this_one(): void
    {
        $user = User::factory()->create(['password' => Hash::make('OldPassword1!')]);
        $oldHash = $user->password;

        $this->changePassword($user);
        $this->get(route('dashboard'))->assertOk();

        $this->flushSession();
        Auth::forgetGuards();
        $this->otherDevice($user->fresh(), $oldHash)
            ->get(route('dashboard'))
            ->assertRedirect(route('login'));
    }

    public function test_a_new_password_voids_an_earlier_reset_link(): void
    {
        $user = User::factory()->create(['password' => Hash::make('OldPassword1!')]);
        $token = Password::broker()->createToken($user);

        $this->changePassword($user);

        $this->assertFalse(Password::broker()->tokenExists($user, $token));
    }

    public function test_a_reset_password_signs_out_every_device(): void
    {
        $user = User::factory()->create(['password' => Hash::make('OldPassword1!')]);
        $oldHash = $user->password;
        $user->forceFill(['password' => Hash::make('NewPassword2!')])->save();

        $this->otherDevice($user, $oldHash)
            ->get(route('dashboard'))
            ->assertRedirect(route('login'));
    }

    public function test_an_unchanged_password_keeps_everyone_signed_in(): void
    {
        $user = User::factory()->create();

        $this->otherDevice($user, $user->password)
            ->get(route('dashboard'))
            ->assertOk();
    }
}
