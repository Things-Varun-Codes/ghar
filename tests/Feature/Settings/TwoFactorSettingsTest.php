<?php

namespace Tests\Feature\Settings;

use App\Shell\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class TwoFactorSettingsTest extends TestCase
{
    use RefreshDatabase;

    private function confirmed(User $user): static
    {
        return $this->actingAs($user)->withSession(['auth.password_confirmed_at' => time()]);
    }

    public function test_the_page_asks_for_the_password_first(): void
    {
        $this->actingAs(User::factory()->create())
            ->get(route('settings.security.show'))
            ->assertRedirect(route('password.confirm'));

        $this->get(route('password.confirm'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->component('Shell/Pages/Auth/ConfirmPassword'));
    }

    public function test_the_right_password_opens_the_page(): void
    {
        $this->actingAs(User::factory()->create())
            ->from(route('settings.security.show'))
            ->get(route('settings.security.show'));

        $this->post(route('password.confirm.store'), ['password' => 'password'])
            ->assertRedirect(route('settings.security.show'));

        $this->get(route('settings.security.show'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Shell/Pages/Settings/Security')
                ->where('enabled', false)
                ->where('pending', false)
                ->where('qrSvg', null));
    }

    public function test_setting_it_up_shows_a_code_to_scan_then_turns_on_with_a_code(): void
    {
        $user = User::factory()->create();

        $this->confirmed($user)
            ->from(route('settings.security.show'))
            ->post(route('two-factor.enable'))
            ->assertRedirect(route('settings.security.show'));

        $secret = null;
        $this->get(route('settings.security.show'))
            ->assertInertia(function (AssertableInertia $page) use (&$secret) {
                $page->where('enabled', false)
                    ->where('pending', true)
                    ->where('qrSvg', fn (string $svg) => str_contains($svg, '<svg'))
                    ->where('setupKey', function (string $key) use (&$secret) {
                        $secret = $key;

                        return true;
                    })
                    ->missing('recoveryCodes');
            });

        $this->from(route('settings.security.show'))
            ->post(route('two-factor.confirm'), ['code' => app(Google2FA::class)->getCurrentOtp($secret)])
            ->assertRedirect(route('settings.security.show'));

        $this->get(route('settings.security.show'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('enabled', true)
                ->where('pending', false)
                ->where('setupKey', null)
                ->has('recoveryCodes', 8));

        $this->assertTrue($user->fresh()->hasEnabledTwoFactorAuthentication());
    }

    public function test_a_wrong_code_while_setting_up_stays_off(): void
    {
        $user = User::factory()->create();
        $this->confirmed($user)->post(route('two-factor.enable'));

        $this->from(route('settings.security.show'))
            ->post(route('two-factor.confirm'), ['code' => '000000'])
            ->assertSessionHasErrorsIn('confirmTwoFactorAuthentication', 'code');

        $this->assertFalse($user->fresh()->hasEnabledTwoFactorAuthentication());
    }

    public function test_recovery_codes_come_only_when_asked_for(): void
    {
        $user = User::factory()->withTwoFactor('JBSWY3DPEHPK3PXP', ['one', 'two'])->create();

        $this->confirmed($user)
            ->get(route('settings.security.show'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('enabled', true)
                ->missing('recoveryCodes')
                ->reloadOnly('recoveryCodes', fn (AssertableInertia $reload) => $reload
                    ->where('recoveryCodes', ['one', 'two'])));
    }

    public function test_turning_it_off_clears_the_secret(): void
    {
        $user = User::factory()->withTwoFactor()->create();

        $this->confirmed($user)
            ->from(route('settings.security.show'))
            ->delete(route('two-factor.disable'))
            ->assertRedirect(route('settings.security.show'));

        $this->assertFalse($user->fresh()->hasEnabledTwoFactorAuthentication());
        $this->assertNull($user->fresh()->two_factor_secret);
    }

    public function test_changes_need_a_recent_password(): void
    {
        $this->actingAs(User::factory()->create())
            ->post(route('two-factor.enable'))
            ->assertRedirect(route('password.confirm'));
    }

    public function test_the_secret_never_reaches_a_page_through_the_user(): void
    {
        $user = User::factory()->withTwoFactor()->create();

        $this->assertArrayNotHasKey('two_factor_secret', $user->toArray());
        $this->assertArrayNotHasKey('two_factor_recovery_codes', $user->toArray());
    }

    public function test_admins_see_who_has_it_on(): void
    {
        $this->seed(RoleSeeder::class);
        $admin = User::factory()->admin()->create();
        $on = User::factory()->withTwoFactor()->create();

        $this->actingAs($admin)
            ->get(route('admin.users.index'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('users.data', fn ($users) => collect($users)->firstWhere('id', $on->id)['two_factor'] === true
                    && collect($users)->firstWhere('id', $admin->id)['two_factor'] === false));
    }
}
