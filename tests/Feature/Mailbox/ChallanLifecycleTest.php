<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Actions\PayChallan;
use App\MiniApps\Mailbox\Models\Challan;
use App\Shell\Models\User;
use App\Shell\Notifications\GenericPushNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class ChallanLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private function seedPair(): array
    {
        $issuer = User::factory()->create(['name' => 'Alice Smith']);
        $recipient = User::factory()->create(['name' => 'Bob Jones']);

        return [$issuer, $recipient];
    }

    public function test_issue_creates_one_issued_row_with_unique_ref_no_and_partner_recipient(): void
    {
        Notification::fake();
        [$issuer, $recipient] = $this->seedPair();

        $response = $this->actingAs($issuer)->post('/apps/our-mailbox/challans', [
            'recipient_ids' => [$recipient->id],
            'offence' => 'Replied with just k',
            'penalty' => '3 hugs',
        ]);

        $challan = Challan::firstOrFail();
        $response->assertRedirect("/apps/our-mailbox/challans/{$challan->id}");
        $this->assertSuccessToast($response, 'Challan issued.');

        $this->assertSame(Challan::STATUS_ISSUED, $challan->status);
        $this->assertSame($issuer->id, $challan->issuer_id);
        $this->assertSame($recipient->id, $challan->recipient_id);
        $this->assertMatchesRegularExpression('#^OC/\d{4}/\d{6}$#', $challan->ref_no);
        // Free-text offence/penalty persist verbatim — no catalog snapshot.
        $this->assertSame('Replied with just k', $challan->offence);
        $this->assertSame('3 hugs', $challan->penalty);
    }

    public function test_recipient_can_pay_an_issued_citation(): void
    {
        Notification::fake();
        [$issuer, $recipient] = $this->seedPair();
        $challan = Challan::factory()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
        ]);

        $response = $this->actingAs($recipient)
            ->patch("/apps/our-mailbox/challans/{$challan->id}/pay")
            ->assertRedirect();
        $this->assertSuccessToast($response, 'Challan paid.');

        $challan->refresh();
        $this->assertSame(Challan::STATUS_PAID, $challan->status);
        $this->assertNotNull($challan->settled_at);
    }

    public function test_double_pay_via_action_is_rejected_and_fires_no_extra_push(): void
    {
        Notification::fake();
        [$issuer, $recipient] = $this->seedPair();
        $challan = Challan::factory()->paid()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
        ]);
        $settledAt = $challan->settled_at;

        // Direct action call — defence in depth beyond the route policy gate.
        try {
            app(PayChallan::class)($challan, $recipient);
            $this->fail('Expected an illegal-transition abort.');
        } catch (HttpException $e) {
            $this->assertSame(422, $e->getStatusCode());
        }

        $challan->refresh();
        $this->assertSame(Challan::STATUS_PAID, $challan->status);
        $this->assertEquals($settledAt, $challan->settled_at);
        Notification::assertNothingSent();
    }

    public function test_issuing_to_several_people_creates_one_challan_each_and_pushes_to_each(): void
    {
        Notification::fake();
        [$issuer, $first] = $this->seedPair();
        $second = User::factory()->create();
        $bystander = User::factory()->create();

        $response = $this->actingAs($issuer)->post('/apps/our-mailbox/challans', [
            'recipient_ids' => [$first->id, $second->id],
            'offence' => 'Hogged the remote',
            'penalty' => 'Make tea',
        ]);

        $response->assertRedirect('/apps/our-mailbox/challans?tab=issued');
        $this->assertSuccessToast($response, '2 challans issued.');

        $this->assertSame(
            [$first->id, $second->id],
            Challan::query()->orderBy('id')->pluck('recipient_id')->all(),
        );
        Notification::assertSentTo($first, GenericPushNotification::class);
        Notification::assertSentTo($second, GenericPushNotification::class);
        Notification::assertNotSentTo($bystander, GenericPushNotification::class);
        Notification::assertNotSentTo($issuer, GenericPushNotification::class);
    }

    public function test_issuing_to_yourself_is_refused(): void
    {
        [$issuer] = $this->seedPair();

        $this->actingAs($issuer)
            ->from('/apps/our-mailbox/challans')
            ->post('/apps/our-mailbox/challans', [
                'recipient_ids' => [$issuer->id],
                'offence' => 'Hogged the remote',
                'penalty' => 'Make tea',
            ])
            ->assertSessionHasErrors('recipient_ids.0');

        $this->assertDatabaseCount('mailbox_challans', 0);
    }
}
