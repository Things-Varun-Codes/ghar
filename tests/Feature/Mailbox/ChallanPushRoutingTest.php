<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Models\Challan;
use App\Shell\Models\User;
use App\Shell\Notifications\GenericPushNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class ChallanPushRoutingTest extends TestCase
{
    use RefreshDatabase;

    private function seedPair(): array
    {
        $issuer = User::factory()->create(['name' => 'Alice Smith']);
        $recipient = User::factory()->create(['name' => 'Bob Jones']);

        return [$issuer, $recipient];
    }

    public function test_issue_pushes_generic_body_to_recipient_only(): void
    {
        Notification::fake();
        [$issuer, $recipient] = $this->seedPair();

        $this->actingAs($issuer)->post('/apps/our-mailbox/challans', [
            'recipient_ids' => [$recipient->id],
            'offence' => 'Stole all the blankets in the night',
            'penalty' => 'a back rub',
            'remarks' => 'Froze at 3am, secret leak string',
        ]);

        Notification::assertSentTo(
            $recipient,
            GenericPushNotification::class,
            function (GenericPushNotification $notification) use ($recipient) {
                $body = $notification->toWebPush($recipient, $notification)->toArray()['body'] ?? '';
                $tag = $notification->toWebPush($recipient, $notification)->toArray()['tag'] ?? null;

                return $tag === 'our-mailbox:challans'
                    && str_contains($body, 'Alice')
                    && str_contains($body, 'citation')
                    // No offence / penalty / remarks leak.
                    && ! str_contains($body, 'blankets')
                    && ! str_contains($body, 'back rub')
                    && ! str_contains($body, 'secret leak string');
            }
        );

        Notification::assertNotSentTo($issuer, GenericPushNotification::class);
    }

    public function test_pay_pushes_to_issuer_only(): void
    {
        Notification::fake();
        [$issuer, $recipient] = $this->seedPair();
        $challan = Challan::factory()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
        ]);

        $this->actingAs($recipient)->patch("/apps/our-mailbox/challans/{$challan->id}/pay");

        Notification::assertSentTo(
            $issuer,
            GenericPushNotification::class,
            function (GenericPushNotification $notification) use ($issuer) {
                $arr = $notification->toWebPush($issuer, $notification)->toArray();

                return ($arr['tag'] ?? null) === 'our-mailbox:challans'
                    && str_contains($arr['body'] ?? '', 'Bob');
            }
        );
        Notification::assertNotSentTo($recipient, GenericPushNotification::class);
    }
}
