<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Contracts\ImageGenerator;
use App\MiniApps\Mailbox\Models\Postcard;
use App\MiniApps\Mailbox\Services\FakeImageGenerator;
use App\Shell\Models\User;
use App\Shell\Notifications\GenericPushNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PostcardRecipientsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('s3');
        $this->app->bind(ImageGenerator::class, FakeImageGenerator::class);
    }

    public function test_postcard_to_several_people_pushes_only_to_them_with_separate_read_state(): void
    {
        Notification::fake();

        $sender = User::factory()->create();
        $first = User::factory()->create();
        $second = User::factory()->create();
        $bystander = User::factory()->create();

        $this->actingAs($sender)->post('/apps/our-exchange/postcards', [
            'recipient_ids' => [$first->id, $second->id],
            'prompt' => 'A fox in the snow',
            'image' => base64_encode(file_get_contents(public_path('img/placeholder-postcard.jpg'))),
            'mime' => 'image/jpeg',
        ])->assertRedirect('/apps/our-exchange/postcards?tab=sent');

        $postcard = Postcard::firstOrFail();

        Notification::assertSentTo($first, GenericPushNotification::class);
        Notification::assertSentTo($second, GenericPushNotification::class);
        Notification::assertNotSentTo($bystander, GenericPushNotification::class);

        $this->actingAs($first)->get('/apps/our-exchange/postcards')->assertOk();

        $this->assertNotNull($postcard->readAtFor($first));
        $this->assertNull($postcard->readAtFor($second));
    }

    public function test_sending_a_postcard_to_yourself_is_refused(): void
    {
        $sender = User::factory()->create();

        $this->actingAs($sender)
            ->from('/apps/our-exchange/postcards')
            ->post('/apps/our-exchange/postcards', [
                'recipient_ids' => [$sender->id],
                'prompt' => 'A fox in the snow',
                'image' => base64_encode(file_get_contents(public_path('img/placeholder-postcard.jpg'))),
                'mime' => 'image/jpeg',
            ])
            ->assertSessionHasErrors('recipient_ids.0');

        $this->assertDatabaseCount('mailbox_postcards', 0);
    }

    public function test_a_bystander_sees_nothing_and_cannot_delete(): void
    {
        $sender = User::factory()->create();
        $recipient = User::factory()->create();
        $bystander = User::factory()->create();

        $postcard = Postcard::factory()->to($recipient)->create(['sender_id' => $sender->id]);

        foreach (['received', 'sent'] as $tab) {
            $this->actingAs($bystander)
                ->get('/apps/our-exchange/postcards?tab='.$tab)
                ->assertInertia(fn ($page) => $page->has('postcards.data', 0));
        }

        $this->actingAs($bystander)
            ->get('/apps/our-exchange')
            ->assertInertia(fn ($page) => $page->where('mailboxSummary.counts.postcards', 0));

        $this->actingAs($bystander)->delete("/apps/our-exchange/postcards/{$postcard->id}")->assertForbidden();
        $this->assertModelExists($postcard);
    }

    public function test_an_old_flowers_link_lands_on_postcards_at_the_same_entry(): void
    {
        $this->actingAs(User::factory()->create())
            ->get('/apps/our-exchange/flowers?focus=7')
            ->assertRedirect('/apps/our-exchange/postcards?focus=7');
    }
}
