<?php

namespace Tests\Feature\Invites;

use App\Shell\Models\Invitation;
use App\Shell\Models\User;
use App\Shell\Notifications\InvitationNotification;
use Database\Seeders\RoleSeeder;
use Illuminate\Database\Eloquent\MassAssignmentException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class InvitationMassAssignmentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    protected function tearDown(): void
    {
        Model::preventSilentlyDiscardingAttributes(false);
        parent::tearDown();
    }

    public function test_guarded_lifecycle_fields_are_silently_discarded_in_production_mode(): void
    {
        // Production posture — AppServiceProvider only enables shouldBeStrict() OUTSIDE
        // production, so preventSilentlyDiscardingAttributes is off here.
        Model::preventSilentlyDiscardingAttributes(false);

        $invitation = new Invitation;
        $invitation->fill([
            'email' => 'invitee@example.com',
            'token_hash' => 'attacker-supplied-hash',
            'accepted_at' => now(),
            'revoked_at' => now(),
        ]);

        $this->assertSame('invitee@example.com', $invitation->email);
        $this->assertArrayNotHasKey('token_hash', $invitation->getAttributes());
        $this->assertArrayNotHasKey('accepted_at', $invitation->getAttributes());
        $this->assertArrayNotHasKey('revoked_at', $invitation->getAttributes());
    }

    public function test_guarded_lifecycle_fields_throw_under_strict_mode(): void
    {
        Model::preventSilentlyDiscardingAttributes(true);

        $this->expectException(MassAssignmentException::class);

        (new Invitation)->fill(['token_hash' => 'attacker-supplied-hash']);
    }

    public function test_full_invite_lifecycle_still_works_end_to_end(): void
    {
        Notification::fake();

        $admin = User::factory()->admin()->create();

        // Admin sends an invite.
        $this->actingAs($admin)->post(route('admin.invites.store'), [
            'email' => 'invitee@example.com',
            'role' => 'user',
        ]);

        $invitation = Invitation::where('email', 'invitee@example.com')->firstOrFail();
        $this->assertSame(64, strlen($invitation->token_hash));
        $this->assertMatchesRegularExpression('/^[0-9a-f]{64}$/', $invitation->token_hash);

        $originalTokenHash = $invitation->token_hash;

        // Admin resends — original is revoked, a fresh token is issued.
        $this->actingAs($admin)->post(route('admin.invites.resend', $invitation));

        $invitation->refresh();
        $this->assertNotNull($invitation->revoked_at);

        $newInvitation = Invitation::where('email', 'invitee@example.com')
            ->whereNull('revoked_at')
            ->firstOrFail();
        $this->assertNotSame($originalTokenHash, $newInvitation->token_hash);

        // Invitee accepts using the fresh invitation's token — capture the  plaintext from
        // the notification the resend dispatched (the  plaintext itself is never persisted;
        // only its sha256 hash is).
        $plaintext = null;
        Notification::assertSentOnDemand(
            InvitationNotification::class,
            function (InvitationNotification $notification, array $channels, $notifiable) use (&$plaintext, $newInvitation) {
                $reflection = new \ReflectionClass($notification);
                $plaintextProperty = $reflection->getProperty('plaintext');
                $plaintextProperty->setAccessible(true);
                $candidate = $plaintextProperty->getValue($notification);

                if (hash('sha256', $candidate) === $newInvitation->token_hash) {
                    $plaintext = $candidate;

                    return true;
                }

                return false;
            }
        );

        $this->assertNotEmpty($plaintext, 'expected to capture the fresh invite token plaintext');

        $this->post(route('invitations.accept.store', ['token' => $plaintext]), [
            'name' => 'Invitee Person',
            'password' => 'correct-horse-battery-staple',
            'password_confirmation' => 'correct-horse-battery-staple',
        ]);

        $newInvitation->refresh();
        $this->assertNotNull($newInvitation->accepted_at);
        $this->assertDatabaseHas('users', ['email' => 'invitee@example.com']);

        // Admin deletes a fresh pending invite — revoked_at is set (soft  revoke, not a hard
        // delete of the row).
        $this->actingAs($admin)->post(route('admin.invites.store'), [
            'email' => 'pending@example.com',
            'role' => 'user',
        ]);
        $pending = Invitation::where('email', 'pending@example.com')->firstOrFail();

        $this->actingAs($admin)->delete(route('admin.invites.destroy', $pending));

        $pending->refresh();
        $this->assertNotNull($pending->revoked_at);
    }
}
