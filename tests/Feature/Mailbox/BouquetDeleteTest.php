<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Models\Bouquet;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BouquetDeleteTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_delete_a_bouquet_and_its_r2_object_is_pruned(): void
    {
        Storage::fake('s3');

        /** @var User $sender */
        $sender = User::factory()->create();
        /** @var User $recipient */
        $recipient = User::factory()->create();

        $key = 'bouquets/deletable.png';
        Storage::disk('s3')->put($key, 'fake-jpeg-bytes-for-testing');

        $bouquet = Bouquet::factory()->to($recipient)->create([
            'sender_id' => $sender->id,
            'image_key' => $key,
        ]);

        Storage::disk('s3')->assertExists($key);

        $this->actingAs($sender)
            ->delete("/apps/our-mailbox/flowers/{$bouquet->id}")
            ->assertRedirect();

        // Row gone AND the stored object pruned (no orphan).
        $this->assertDatabaseMissing('mailbox_bouquets', ['id' => $bouquet->id]);
        Storage::disk('s3')->assertMissing($key);
    }

    public function test_non_sender_cannot_delete_a_bouquet(): void
    {
        Storage::fake('s3');

        /** @var User $sender */
        $sender = User::factory()->create();
        /** @var User $recipient */
        $recipient = User::factory()->create();

        $key = 'bouquets/protected.png';
        Storage::disk('s3')->put($key, 'fake-jpeg-bytes-for-testing');

        $bouquet = Bouquet::factory()->to($recipient)->create([
            'sender_id' => $sender->id,
            'image_key' => $key,
        ]);

        // The recipient (non-sender) cannot delete the bouquet.
        $this->actingAs($recipient)
            ->delete("/apps/our-mailbox/flowers/{$bouquet->id}")
            ->assertStatus(403);

        $this->assertDatabaseHas('mailbox_bouquets', ['id' => $bouquet->id]);
        Storage::disk('s3')->assertExists($key);
    }
}
