<?php

namespace Tests\Feature\Invites;

use App\Shell\Models\Invitation;
use App\Shell\Models\User;
use App\Shell\Notifications\InvitationNotification;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Tests\TestCase;

class ResendInviteRotatesTokenTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    public function test_resend_revokes_old_invite_and_creates_new_one(): void
    {
        Notification::fake();

        $admin = User::factory()->admin()->create();
        $plaintext = Str::random(64);

        $original = Invitation::forceCreate([
            'email' => 'invitee@example.com',
            'role_name' => 'user',
            'token_hash' => hash('sha256', $plaintext),
            'expires_at' => now()->addDays(7),
            'invited_by_user_id' => $admin->id,
        ]);

        $response = $this->actingAs($admin)
            ->post(route('admin.invites.resend', ['invite' => $original->id]));

        $response->assertRedirect(route('admin.invites.index'));
        $response->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'Invitation resent to '.$original->email.'.']);

        // Original invite must be revoked
        $original->refresh();
        $this->assertNotNull($original->revoked_at);

        // A new pending invite must exist for the same email
        $newInvite = Invitation::pending()->where('email', 'invitee@example.com')->first();
        $this->assertNotNull($newInvite);
        $this->assertNotSame($original->token_hash, $newInvite->token_hash);

        // Notification sent
        Notification::assertSentOnDemand(InvitationNotification::class);
    }

    public function test_old_token_is_invalid_after_resend(): void
    {
        Notification::fake();

        $admin = User::factory()->admin()->create();
        $oldPlaintext = Str::random(64);

        $original = Invitation::forceCreate([
            'email' => 'invitee@example.com',
            'role_name' => 'user',
            'token_hash' => hash('sha256', $oldPlaintext),
            'expires_at' => now()->addDays(7),
            'invited_by_user_id' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->post(route('admin.invites.resend', ['invite' => $original->id]));

        $response = $this->get(route('invitations.accept.show', ['token' => $oldPlaintext]));
        $response->assertRedirect(route('login'));
    }

    /** @param  array<string, mixed>  $overrides */
    private function makeInvite(User $admin, array $overrides = []): Invitation
    {
        return Invitation::forceCreate([
            'email' => 'invitee@example.com',
            'role_name' => 'user',
            'token_hash' => hash('sha256', Str::random(64)),
            'expires_at' => now()->addDays(7),
            'invited_by_user_id' => $admin->id,
            ...$overrides,
        ]);
    }

    public function test_resend_refuses_an_invite_that_is_no_longer_pending(): void
    {
        Notification::fake();
        $admin = User::factory()->admin()->create();

        foreach ([
            ['accepted_at' => now()],
            ['revoked_at' => now()],
            ['expires_at' => now()->subDay()],
        ] as $state) {
            $invite = $this->makeInvite($admin, $state);

            $this->actingAs($admin)
                ->post(route('admin.invites.resend', ['invite' => $invite->id]))
                ->assertRedirect(route('admin.invites.index'))
                ->assertInertiaFlash('toast', ['type' => 'error', 'message' => 'This invitation is no longer pending.']);
        }

        $this->assertSame(0, Invitation::pending()->count());
        Notification::assertNothingSent();
    }

    public function test_resend_refuses_an_email_that_already_registered(): void
    {
        Notification::fake();
        $admin = User::factory()->admin()->create();
        User::factory()->create(['email' => 'invitee@example.com']);
        $invite = $this->makeInvite($admin);

        $this->actingAs($admin)
            ->post(route('admin.invites.resend', ['invite' => $invite->id]))
            ->assertRedirect(route('admin.invites.index'))
            ->assertInertiaFlash('toast', ['type' => 'error', 'message' => 'That email address already has an account.']);

        $this->assertNull($invite->refresh()->revoked_at);
        Notification::assertNothingSent();
    }

    public function test_a_failed_send_keeps_the_original_invite_usable(): void
    {
        $admin = User::factory()->admin()->create();
        $invite = $this->makeInvite($admin);
        Notification::shouldReceive('send')->andThrow(new \RuntimeException('mail down'));

        $this->withoutExceptionHandling();

        try {
            $this->actingAs($admin)->post(route('admin.invites.resend', ['invite' => $invite->id]));
            $this->fail('The send failure should have propagated.');
        } catch (\RuntimeException $e) {
            $this->assertSame('mail down', $e->getMessage());
        }

        $this->assertNull($invite->refresh()->revoked_at);
        $this->assertSame(1, Invitation::query()->count());
    }
}
