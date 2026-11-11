<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Contracts\BouquetImageGenerator;
use App\MiniApps\Mailbox\Models\Bouquet;
use App\MiniApps\Mailbox\Services\FakeBouquetGenerator;
use App\Shell\Models\User;
use App\Shell\Notifications\GenericPushNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BouquetRecipientsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('s3');
        $this->app->bind(BouquetImageGenerator::class, FakeBouquetGenerator::class);
    }

    public function test_bouquet_to_several_people_pushes_only_to_them_with_separate_read_state(): void
    {
        Notification::fake();

        $sender = User::factory()->create();
        $first = User::factory()->create();
        $second = User::factory()->create();
        $bystander = User::factory()->create();

        $this->actingAs($sender)->post('/apps/our-mailbox/bouquets', [
            'recipient_ids' => [$first->id, $second->id],
            'flowers' => ['red_rose'],
            'image' => base64_encode(file_get_contents(public_path('img/placeholder-bouquet.jpg'))),
            'mime' => 'image/jpeg',
        ])->assertRedirect('/apps/our-mailbox/flowers');

        $bouquet = Bouquet::firstOrFail();

        Notification::assertSentTo($first, GenericPushNotification::class);
        Notification::assertSentTo($second, GenericPushNotification::class);
        Notification::assertNotSentTo($bystander, GenericPushNotification::class);

        $this->actingAs($first)->get('/apps/our-mailbox/flowers')->assertOk();

        $this->assertNotNull($bouquet->readAtFor($first));
        $this->assertNull($bouquet->readAtFor($second));
    }

    public function test_sending_flowers_to_yourself_is_refused(): void
    {
        $sender = User::factory()->create();

        $this->actingAs($sender)
            ->from('/apps/our-mailbox/flowers')
            ->post('/apps/our-mailbox/bouquets', [
                'recipient_ids' => [$sender->id],
                'flowers' => ['red_rose'],
                'image' => base64_encode(file_get_contents(public_path('img/placeholder-bouquet.jpg'))),
                'mime' => 'image/jpeg',
            ])
            ->assertSessionHasErrors('recipient_ids.0');

        $this->assertDatabaseCount('mailbox_bouquets', 0);
    }

    public function test_a_bystander_sees_nothing_and_cannot_delete(): void
    {
        $sender = User::factory()->create();
        $recipient = User::factory()->create();
        $bystander = User::factory()->create();

        $bouquet = Bouquet::factory()->to($recipient)->create(['sender_id' => $sender->id]);

        foreach (['received', 'sent'] as $tab) {
            $this->actingAs($bystander)
                ->get('/apps/our-mailbox/flowers?tab='.$tab)
                ->assertInertia(fn ($page) => $page->has('bouquets.data', 0));
        }

        $this->actingAs($bystander)
            ->get('/apps/our-mailbox')
            ->assertInertia(fn ($page) => $page->where('mailboxSummary.counts.flowers', 0));

        $this->actingAs($bystander)->delete("/apps/our-mailbox/flowers/{$bouquet->id}")->assertForbidden();
        $this->assertModelExists($bouquet);
    }
}
