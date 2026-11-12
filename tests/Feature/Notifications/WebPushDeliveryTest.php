<?php

namespace Tests\Feature\Notifications;

use App\Shell\Models\User;
use App\Shell\Notifications\GenericPushNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Minishlink\WebPush\VAPID;
use Tests\TestCase;

/**
 * Pushes leave through Laravel's HTTP client, so the request itself can be checked here.
 */
class WebPushDeliveryTest extends TestCase
{
    use RefreshDatabase;

    private const ENDPOINT = 'https://push.example.test/send/abc123';

    private function subscribedUser(): User
    {
        $vapid = VAPID::createVapidKeys();
        config([
            'webpush.vapid.subject' => 'mailto:admin@example.test',
            'webpush.vapid.public_key' => $vapid['publicKey'],
            'webpush.vapid.private_key' => $vapid['privateKey'],
        ]);

        /** @var User $user */
        $user = User::factory()->create();

        // Any P-256 public key stands in for the browser's.
        $user->updatePushSubscription(
            self::ENDPOINT,
            VAPID::createVapidKeys()['publicKey'],
            rtrim(strtr(base64_encode(random_bytes(16)), '+/', '-_'), '='),
            'aes128gcm',
        );

        return $user;
    }

    public function test_a_push_is_encrypted_signed_and_posted_to_the_subscription_endpoint(): void
    {
        Http::fake([self::ENDPOINT => Http::response('', 201)]);
        $user = $this->subscribedUser();

        $user->notifyNow(new GenericPushNotification(['app' => 'our-mailbox', 'body' => 'Open the mailbox'], ['push']));

        Http::assertSent(fn (Request $request) => $request->url() === self::ENDPOINT
            && $request->method() === 'POST'
            && $request->header('Content-Encoding') === ['aes128gcm']
            && str_starts_with($request->header('Authorization')[0] ?? '', 'vapid ')
            && ! str_contains($request->body(), 'Open the mailbox'));
        $this->assertDatabaseHas('push_subscriptions', ['endpoint' => self::ENDPOINT]);
    }

    public function test_a_subscription_the_push_service_says_is_gone_is_removed(): void
    {
        Http::fake([self::ENDPOINT => Http::response('', 410)]);
        $user = $this->subscribedUser();

        $user->notifyNow(new GenericPushNotification(['app' => 'our-mailbox', 'body' => 'Open the mailbox'], ['push']));

        $this->assertDatabaseMissing('push_subscriptions', ['endpoint' => self::ENDPOINT]);
    }
}
