<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Contracts\BouquetImageGenerator;
use App\MiniApps\Mailbox\Models\Bouquet;
use App\MiniApps\Mailbox\Services\FakeBouquetGenerator;
use App\Shell\Models\User;
use App\Shell\Notifications\GenericPushNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class BouquetSendControllerTest extends TestCase
{
    use RefreshDatabase;

    private function bindFake(): void
    {
        $this->app->bind(
            BouquetImageGenerator::class,
            FakeBouquetGenerator::class,
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

        $fakeBase64 = base64_encode(file_get_contents(public_path('img/placeholder-bouquet.jpg')));

        $response = $this->actingAs($sender)->post('/apps/our-mailbox/bouquets', [
            'recipient_ids' => [$recipient->id],
            'flowers' => ['red_rose', 'peony'],
            'note' => 'for you',
            'image' => $fakeBase64,
            'mime' => 'image/jpeg',
        ]);

        // store() redirects to the Flowers page.
        $response->assertRedirect('/apps/our-mailbox/flowers');

        // Exactly 1 bouquet row, and it lives in mailbox_bouquets (not mailbox_messages).
        $this->assertDatabaseCount('mailbox_bouquets', 1);
        $this->assertDatabaseCount('mailbox_messages', 0);
        $this->assertDatabaseHas('mailbox_bouquets', [
            'sender_id' => $sender->id,
        ]);

        $bouquet = Bouquet::firstOrFail();
        $this->assertNotNull($bouquet->image_key, 'image_key must be set after send');
        $this->assertStringStartsWith(
            'bouquets/',
            $bouquet->image_key,
            'image_key must be stored under the bouquets/ prefix'
        );

        $this->assertSame([$recipient->id], $bouquet->recipients()->pluck('users.id')->all());

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

                return ($messageArray['tag'] ?? null) === 'our-mailbox:flowers'
                    && str_contains($messageArray['body'] ?? '', 'You got a bouquet from')
                    && str_starts_with($messageArray['data']['url'] ?? '', '/apps/our-mailbox/flowers?focus=');
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
        $response = $this->postJson('/apps/our-mailbox/bouquets', [
            'flowers' => ['red_rose'],
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

        $this->actingAs($sender)->post('/apps/our-mailbox/bouquets', [
            'recipient_ids' => [$recipient->id],
            'flowers' => ['red_rose'],
            'image' => $image,
            'mime' => 'image/jpeg',
        ])->assertSessionHasErrors('image');

        $this->assertDatabaseCount('mailbox_bouquets', 0);
        $this->assertSame([], Storage::disk('s3')->allFiles());
    }

    public function test_send_rejects_an_oversized_image(): void
    {
        $sender = User::factory()->create();
        $recipient = User::factory()->create();

        $this->actingAs($sender)->post('/apps/our-mailbox/bouquets', [
            'recipient_ids' => [$recipient->id],
            'flowers' => ['red_rose'],
            'image' => str_repeat('A', 14 * 1024 * 1024),
            'mime' => 'image/jpeg',
        ])->assertSessionHasErrors(['image' => 'The bouquet image is too large (max 10 MB).']);
    }

    public function test_the_stored_extension_comes_from_the_real_image_type(): void
    {
        Notification::fake();
        Storage::fake('s3');
        $sender = User::factory()->create();
        $recipient = User::factory()->create();
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');

        $this->actingAs($sender)->post('/apps/our-mailbox/bouquets', [
            'recipient_ids' => [$recipient->id],
            'flowers' => ['red_rose'],
            'image' => base64_encode($png),
            'mime' => 'image/jpeg',
        ])->assertSessionHasNoErrors();

        $this->assertStringEndsWith('.png', Bouquet::firstOrFail()->image_key);
    }
}
