<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Contracts\ImageGenerator;
use App\MiniApps\Mailbox\Models\Postcard;
use App\MiniApps\Mailbox\Services\FakeImageGenerator;
use App\Shell\Models\User;
use App\Shell\Notifications\GenericPushNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class PostcardSendControllerTest extends TestCase
{
    use RefreshDatabase;

    private function bindFake(): void
    {
        $this->app->bind(
            ImageGenerator::class,
            FakeImageGenerator::class,
        );
    }

    public function test_send_creates_row_r2_object_and_push_to_the_recipient(): void
    {
        Notification::fake();
        Storage::fake('s3');
        $this->bindFake();

        /** @var User $sender */
        $sender = User::factory()->create(['name' => 'Alex Doe']);
        /** @var User $recipient */
        $recipient = User::factory()->create();

        $fakeBase64 = base64_encode(file_get_contents(public_path('img/placeholder-postcard.jpg')));

        $response = $this->actingAs($sender)->post('/apps/our-exchange/postcards', [
            'recipient_ids' => [$recipient->id],
            'prompt' => 'A fox in the snow',
            'note' => 'for you',
            'image' => $fakeBase64,
            'mime' => 'image/jpeg',
        ]);

        // store() lands the sender on their Sent postcards, with a toast.
        $response->assertRedirect('/apps/our-exchange/postcards?tab=sent');
        $this->assertSuccessToast($response, 'Postcard sent.');

        // Exactly 1 postcard row, and it lives in mailbox_postcards (not mailbox_messages).
        $this->assertDatabaseCount('mailbox_postcards', 1);
        $this->assertDatabaseCount('mailbox_messages', 0);
        $this->assertDatabaseHas('mailbox_postcards', [
            'sender_id' => $sender->id,
        ]);

        $postcard = Postcard::firstOrFail();
        $this->assertNotNull($postcard->image_key, 'image_key must be set after send');
        $this->assertStringStartsWith(
            'postcards/',
            $postcard->image_key,
            'image_key must be stored under the postcards/ prefix'
        );

        $this->assertSame([$recipient->id], $postcard->recipients()->pluck('users.id')->all());

        // Exactly 1 stored object written (raw bytes, no GD re-encode).
        $this->assertCount(
            1,
            Storage::disk('s3')->allFiles(),
            'Send must write exactly 1 stored object'
        );

        // Exactly 1 push to $recipient with correct tag + body (own push identity).
        Notification::assertSentTo(
            $recipient,
            GenericPushNotification::class,
            function (GenericPushNotification $notification) use ($recipient) {
                $webPushMessage = $notification->toWebPush($recipient, $notification);
                $messageArray = $webPushMessage->toArray();

                return ($messageArray['tag'] ?? null) === 'our-exchange:postcards'
                    && str_contains($messageArray['body'] ?? '', 'You got a postcard from')
                    && str_starts_with($messageArray['data']['url'] ?? '', '/apps/our-exchange/postcards?focus=');
            }
        );

        // Sender is NOT notified.
        Notification::assertNotSentTo($sender, GenericPushNotification::class);

        // No spatie media records (no GD/Intervention re-encode path).  Third arg to
        // assertDatabaseCount is the DB connection name, not a message —  pass null to use
        // the default connection.
        if (Schema::hasTable('media')) {
            $this->assertDatabaseCount('media', 0);
        }
    }

    public function test_send_requires_authentication(): void
    {
        $response = $this->postJson('/apps/our-exchange/postcards', [
            'prompt' => 'A fox in the snow',
            'image' => base64_encode('test'),
            'mime' => 'image/jpeg',
        ]);

        // Must reject unauthenticated requests.
        $response->assertStatus(401);
    }

    /** @return array<string, array{string}> */
    public static function unreadableImages(): array
    {
        return [
            'not strict base64' => ['not*base64!'],
            'not an image' => [base64_encode('just some text')],
            'an image type outside the allowlist' => [base64_encode(base64_decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'))],
        ];
    }

    #[DataProvider('unreadableImages')]
    public function test_send_rejects_what_is_not_an_allowed_image(string $image): void
    {
        Storage::fake('s3');
        $sender = User::factory()->create();
        $recipient = User::factory()->create();

        $this->actingAs($sender)->post('/apps/our-exchange/postcards', [
            'recipient_ids' => [$recipient->id],
            'prompt' => 'A fox in the snow',
            'image' => $image,
            'mime' => 'image/jpeg',
        ])->assertSessionHasErrors('image');

        $this->assertDatabaseCount('mailbox_postcards', 0);
        $this->assertSame([], Storage::disk('s3')->allFiles());
    }

    public function test_send_rejects_an_oversized_image(): void
    {
        $sender = User::factory()->create();
        $recipient = User::factory()->create();

        $this->actingAs($sender)->post('/apps/our-exchange/postcards', [
            'recipient_ids' => [$recipient->id],
            'prompt' => 'A fox in the snow',
            'image' => str_repeat('A', 14 * 1024 * 1024),
            'mime' => 'image/jpeg',
        ])->assertSessionHasErrors(['image' => 'The postcard image is too large (max 10 MB).']);
    }

    public function test_the_stored_extension_comes_from_the_real_image_type(): void
    {
        Notification::fake();
        Storage::fake('s3');
        $sender = User::factory()->create();
        $recipient = User::factory()->create();
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');

        $this->actingAs($sender)->post('/apps/our-exchange/postcards', [
            'recipient_ids' => [$recipient->id],
            'prompt' => 'A fox in the snow',
            'image' => base64_encode($png),
            'mime' => 'image/jpeg',
        ])->assertSessionHasNoErrors();

        $this->assertStringEndsWith('.png', Postcard::firstOrFail()->image_key);
    }
}
