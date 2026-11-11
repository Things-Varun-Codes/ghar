<?php

namespace Tests\Feature\Auth;

use App\Shell\Models\Invitation;
use App\Shell\Models\User;
use App\Shell\Notifications\InvitationNotification;
use App\Shell\Notifications\ResetPasswordNotification;
use App\Shell\Notifications\VerifyChangedEmailNotification;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Tests\TestCase;

class AuthRegressionSweepTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    public function test_roles_back_admin_gate(): void
    {
        $admin = User::factory()->admin()->create();
        $regular = User::factory()->create();

        $this->assertTrue(Gate::forUser($admin)->allows('admin'));
        $this->assertFalse(Gate::forUser($regular)->allows('admin'));
    }

    public function test_invite_flow_e2e(): void
    {
        Notification::fake();

        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->post(route('admin.invites.store'), [
                'email' => 'invited@example.com',
                'role' => 'user',
            ])
            ->assertRedirect(route('admin.invites.index'));

        /** @var Invitation $invitation */
        $invitation = Invitation::where('email', 'invited@example.com')->firstOrFail();
        $this->assertNotNull($invitation->token_hash);
        $this->assertTrue($invitation->expires_at->isFuture());
        $this->assertTrue($invitation->expires_at->diffInDays(now()) <= 7);

        Notification::assertSentOnDemand(InvitationNotification::class);
    }

    public function test_revoked_invite_blocks_acceptance(): void
    {
        $admin = User::factory()->admin()->create();
        $plaintext = Str::random(64);

        Invitation::forceCreate([
            'email' => 'invitee@example.com',
            'role_name' => 'user',
            'token_hash' => hash('sha256', $plaintext),
            'expires_at' => now()->addDays(7),
            'revoked_at' => now(),
            'invited_by_user_id' => $admin->id,
        ]);

        // Attempting to accept a revoked invite must not create a user.
        $this->post(route('invitations.accept.store', ['token' => $plaintext]), [
            'name' => 'New User',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $this->assertDatabaseMissing('users', ['email' => 'invitee@example.com']);
    }

    public function test_settings_email_change_sends_verification(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'original@example.com',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($user)
            ->patch(route('settings.profile.update'), [
                'name' => $user->name,
                'email' => 'changed@example.com',
            ]);

        // Email must NOT change immediately — pending verification.
        $this->assertSame('original@example.com', $user->fresh()->email);
        // A verification notification must have been sent.
        Notification::assertSentTo($user, VerifyChangedEmailNotification::class);
    }

    public function test_forgot_password_dispatches_warm_notification(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->post(route('password.email'), ['email' => $user->email]);

        Notification::assertSentTo($user, ResetPasswordNotification::class);
    }

    public function test_non_admin_blocked_from_admin_users(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('admin.users.index'))
            ->assertForbidden();
    }

    public function test_admin_self_delete_is_blocked(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->delete(route('admin.users.destroy', ['user' => $admin->id]));

        // The user record must still exist — self-delete observer guard fired.
        $this->assertDatabaseHas('users', ['id' => $admin->id]);
    }

    public function test_resend_mailer_registered(): void
    {
        $this->assertSame('resend', config('mail.mailers.resend.transport'));
        $this->assertNotNull(config('services.resend.key'));
    }

    public function test_create_admin_idempotent(): void
    {
        // First invocation succeeds.
        $exitCode = Artisan::call('ghar:create-admin', [
            'email' => 'first@example.com',
            'name' => 'First Admin',
            '--password' => 'pw-one-xxxxxxxx',
        ]);
        $this->assertSame(0, $exitCode);
        $this->assertTrue(User::where('email', 'first@example.com')->firstOrFail()->hasRole('admin'));

        // Second invocation must fail — only one admin may exist.
        $exitCode2 = Artisan::call('ghar:create-admin', [
            'email' => 'second@example.com',
            'name' => 'Second Admin',
            '--password' => 'pw-two-xxxxxxxx',
        ]);
        $this->assertNotEquals(0, $exitCode2);
        $this->assertSame(1, User::role('admin')->count());
    }
}
