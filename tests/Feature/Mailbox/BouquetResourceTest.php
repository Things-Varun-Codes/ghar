<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Http\Resources\BouquetResource;
use App\MiniApps\Mailbox\Models\Bouquet;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BouquetResourceTest extends TestCase
{
    use RefreshDatabase;

    public function test_bouquet_resource_payload_has_note_image_url_flowers_and_no_type(): void
    {
        Storage::fake('s3');

        /** @var User $sender */
        $sender = User::factory()->create();
        /** @var User $recipient */
        $recipient = User::factory()->create();

        $bouquet = Bouquet::factory()->to($recipient)->create([
            'sender_id' => $sender->id,
            'note' => 'Thinking of you',
            'image_key' => 'bouquets/test-uuid.png',
            'flowers' => [
                ['key' => 'red_rose', 'name' => 'Red Rose', 'meaning' => 'Love'],
            ],
            'posted_at' => now(),
        ]);

        $this->actingAs($recipient);

        $payload = $this->app->make(BouquetResource::class)($bouquet->fresh());

        $this->assertSame($bouquet->id, $payload['id']);
        $this->assertSame('Thinking of you', $payload['note']);
        $this->assertStringContainsString('bouquets/test-uuid.png', $payload['image_url']);
        $this->assertSame([
            ['key' => 'red_rose', 'name' => 'Red Rose', 'meaning' => 'Love'],
        ], $payload['flowers']);
        $this->assertArrayNotHasKey('type', $payload);
        $this->assertTrue($payload['is_unread']);
        $this->assertFalse($payload['is_mine']);
        $this->assertSame($sender->id, $payload['sender']['id']);
        $this->assertSame($sender->name, $payload['sender']['name']);
        $this->assertSame([['id' => $recipient->id, 'name' => $recipient->name]], $payload['recipients']);
    }

    public function test_bouquet_resource_is_mine_true_for_sender(): void
    {
        Storage::fake('s3');

        /** @var User $sender */
        $sender = User::factory()->create();
        /** @var User $recipient */
        $recipient = User::factory()->create();

        $bouquet = Bouquet::factory()->to($recipient)->create([
            'sender_id' => $sender->id,
        ]);

        $this->actingAs($sender);

        $payload = $this->app->make(BouquetResource::class)($bouquet->fresh());

        $this->assertTrue($payload['is_mine']);
        $this->assertFalse($payload['is_unread']);
    }
}
