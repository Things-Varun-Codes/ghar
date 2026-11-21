<?php

namespace Tests\Feature\Auth;

use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class TwoFactorTest extends TestCase
{
    use RefreshDatabase;

    private const SECRET = 'JBSWY3DPEHPK3PXP';

    private function signInWithPassword(User $user, bool $remember = false): void
    {
        $this->post(route('login.store'), [
            'email' => $user->email,
            'password' => 'password',
            'remember' => $remember,
        ])->assertRedirect(route('two-factor.login'));
    }

    private function code(): string
    {
        return app(Google2FA::class)->getCurrentOtp(self::SECRET);
    }

    public function test_a_password_alone_does_not_sign_in_when_two_step_is_on(): void
    {
        $this->signInWithPassword(User::factory()->withTwoFactor(self::SECRET)->create());

        $this->assertGuest();
        $this->get(route('two-factor.login'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->component('Shell/Pages/Auth/TwoFactorChallenge'));
    }

    public function test_the_code_from_the_app_signs_in(): void
    {
        $user = User::factory()->withTwoFactor(self::SECRET)->create();
        $this->signInWithPassword($user);

        $this->post(route('two-factor.login.store'), ['code' => $this->code()])
            ->assertRedirect(route('dashboard', absolute: false));

        $this->assertAuthenticatedAs($user);
        $this->assertNotNull($user->fresh()->last_login_at);
    }

    public function test_a_wrong_code_shows_beside_the_field(): void
    {
        $this->signInWithPassword(User::factory()->withTwoFactor(self::SECRET)->create());

        $this->post(route('two-factor.login.store'), ['code' => '000000'])
            ->assertRedirect(route('two-factor.login'))
            ->assertSessionHasErrors(['code' => "That code didn't work. Codes change every 30 seconds, so enter the one showing now."]);

        $this->assertGuest();
    }

    public function test_a_recovery_code_signs_in_once(): void
    {
        $user = User::factory()->withTwoFactor(self::SECRET, ['first-code', 'second-code'])->create();
        $this->signInWithPassword($user);

        $this->post(route('two-factor.login.store'), ['recovery_code' => 'first-code']);

        $this->assertAuthenticatedAs($user);
        $codes = $user->fresh()->recoveryCodes();
        $this->assertNotContains('first-code', $codes);
        $this->assertContains('second-code', $codes);
        $this->assertCount(2, $codes);
    }

    public function test_too_many_wrong_codes_wait_with_an_inline_error(): void
    {
        $this->signInWithPassword(User::factory()->withTwoFactor(self::SECRET)->create());

        for ($i = 0; $i < 5; $i++) {
            $this->post(route('two-factor.login.store'), ['code' => '000000']);
        }

        $this->post(route('two-factor.login.store'), ['code' => $this->code()])
            ->assertRedirect(route('two-factor.login'))
            ->assertSessionHasErrors(['code' => 'Too many tries. Wait a minute, then try again.']);

        $this->assertGuest();
    }

    public function test_keep_me_signed_in_survives_the_second_step(): void
    {
        $user = User::factory()->withTwoFactor(self::SECRET)->create();
        $this->signInWithPassword($user, remember: true);

        $this->post(route('two-factor.login.store'), ['code' => $this->code()]);

        $this->assertAuthenticatedAs($user);
        $this->assertNotNull($user->fresh()->remember_token);
    }

    public function test_an_unconfirmed_setup_does_not_ask_for_a_code(): void
    {
        $user = User::factory()->withTwoFactor(self::SECRET)->create(['two_factor_confirmed_at' => null]);

        $this->post(route('login.store'), ['email' => $user->email, 'password' => 'password'])
            ->assertRedirect(route('dashboard', absolute: false));

        $this->assertAuthenticatedAs($user);
    }

    public function test_the_challenge_needs_a_password_first(): void
    {
        $this->get(route('two-factor.login'))->assertRedirect(route('login'));
    }

    public function test_the_command_turns_it_off_for_someone_locked_out(): void
    {
        $user = User::factory()->withTwoFactor(self::SECRET)->create();

        $this->artisan('ghar:two-factor-off', ['email' => strtoupper($user->email)])->assertSuccessful();

        $this->assertFalse($user->fresh()->hasEnabledTwoFactorAuthentication());
        $this->assertNull($user->fresh()->two_factor_secret);

        $this->artisan('ghar:two-factor-off', ['email' => 'nobody@example.test'])->assertFailed();
    }
}
