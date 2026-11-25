<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Http\Resources\PostcardResource;
use App\MiniApps\Mailbox\Models\Postcard;
use App\Shell\Models\User;
use App\Shell\Support\Person;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PostcardResourceTest extends TestCase
{
    use RefreshDatabase;

    public function test_postcard_resource_payload_has_note_image_url_prompt_and_no_type(): void
    {
        Storage::fake('s3');

        /** @var User $sender */
        $sender = User::factory()->create();
        /** @var User $recipient */
        $recipient = User::factory()->create();

        $postcard = Postcard::factory()->to($recipient)->create([
            'sender_id' => $sender->id,
            'note' => 'Thinking of you',
            'image_key' => 'postcards/test-uuid.png',
            'prompt' => 'A fox in the snow',
            'posted_at' => now(),
        ]);

        $this->actingAs($recipient);

        $payload = $this->app->make(PostcardResource::class)($postcard->fresh());

        $this->assertSame($postcard->id, $payload['id']);
        $this->assertSame('Thinking of you', $payload['note']);
        $this->assertStringContainsString('postcards/test-uuid.png', $payload['image_url']);
        $this->assertSame('A fox in the snow', $payload['prompt']);
        $this->assertArrayNotHasKey('type', $payload);
        $this->assertTrue($payload['is_unread']);
        $this->assertFalse($payload['is_mine']);
        $this->assertSame(Person::short($sender), $payload['sender']);
        $this->assertSame([Person::short($recipient)], $payload['recipients']);
    }

    public function test_postcard_resource_is_mine_true_for_sender(): void
    {
        Storage::fake('s3');

        /** @var User $sender */
        $sender = User::factory()->create();
        /** @var User $recipient */
        $recipient = User::factory()->create();

        $postcard = Postcard::factory()->to($recipient)->create([
            'sender_id' => $sender->id,
        ]);

        $this->actingAs($sender);

        $payload = $this->app->make(PostcardResource::class)($postcard->fresh());

        $this->assertTrue($payload['is_mine']);
        $this->assertFalse($payload['is_unread']);
    }
}
