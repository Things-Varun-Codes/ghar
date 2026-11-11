<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Models\Challan;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ChallanAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    private function seedPair(): array
    {
        $issuer = User::factory()->create(['name' => 'Alice Smith']);
        $recipient = User::factory()->create(['name' => 'Bob Jones']);

        return [$issuer, $recipient];
    }

    public function test_issue_rejects_missing_offence_and_penalty(): void
    {
        Notification::fake();
        [$issuer] = $this->seedPair();

        $this->actingAs($issuer)
            ->from('/apps/our-mailbox/challans')
            ->post('/apps/our-mailbox/challans', [
                'penalty' => '',
            ])
            ->assertSessionHasErrors(['offence', 'penalty']);

        $this->assertDatabaseCount('mailbox_challans', 0);
    }

    public function test_issue_rejects_over_length_offence(): void
    {
        [$issuer] = $this->seedPair();

        $this->actingAs($issuer)
            ->from('/apps/our-mailbox/challans')
            ->post('/apps/our-mailbox/challans', [
                'offence' => str_repeat('a', 121),
                'penalty' => '3 hugs',
            ])
            ->assertSessionHasErrors('offence');

        $this->assertDatabaseCount('mailbox_challans', 0);
    }

    public function test_issue_rejects_over_length_penalty(): void
    {
        [$issuer] = $this->seedPair();

        $this->actingAs($issuer)
            ->from('/apps/our-mailbox/challans')
            ->post('/apps/our-mailbox/challans', [
                'offence' => 'Left on read',
                'penalty' => str_repeat('b', 81),
            ])
            ->assertSessionHasErrors('penalty');

        $this->assertDatabaseCount('mailbox_challans', 0);
    }

    public function test_ref_no_status_issuer_injection_is_ignored(): void
    {
        Notification::fake();
        [$issuer, $recipient] = $this->seedPair();

        $this->actingAs($issuer)->post('/apps/our-mailbox/challans', [
            'recipient_ids' => [$recipient->id],
            'offence' => 'Replied with just k',
            'penalty' => '3 kisses',
            // Injection attempts — all must be ignored (server sets them).
            'ref_no' => 'OC/1999/000001',
            'status' => Challan::STATUS_PAID,
            'issuer_id' => $recipient->id,
        ]);

        $challan = Challan::firstOrFail();
        $this->assertNotSame('OC/1999/000001', $challan->ref_no);
        $this->assertSame(Challan::STATUS_ISSUED, $challan->status);
        $this->assertSame($issuer->id, $challan->issuer_id);
    }

    public function test_non_recipient_cannot_pay(): void
    {
        [$issuer, $recipient] = $this->seedPair();
        $challan = Challan::factory()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
        ]);

        // The issuer is not the recipient → cannot pay their own citation.
        $this->actingAs($issuer)
            ->patch("/apps/our-mailbox/challans/{$challan->id}/pay")
            ->assertForbidden();

        $this->assertSame(Challan::STATUS_ISSUED, $challan->fresh()->status);
    }

    public function test_paying_an_already_paid_row_is_forbidden(): void
    {
        [$issuer, $recipient] = $this->seedPair();
        $challan = Challan::factory()->paid()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
        ]);

        // Paid is terminal — even the recipient can't pay again (policy gate).
        $this->actingAs($recipient)
            ->patch("/apps/our-mailbox/challans/{$challan->id}/pay")
            ->assertForbidden();

        $this->assertSame(Challan::STATUS_PAID, $challan->fresh()->status);
    }

    public function test_issuer_can_withdraw_an_unpaid_citation(): void
    {
        [$issuer, $recipient] = $this->seedPair();
        $challan = Challan::factory()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
        ]);

        $response = $this->actingAs($issuer)
            ->delete("/apps/our-mailbox/challans/{$challan->id}")
            ->assertRedirect('/apps/our-mailbox/challans');
        $this->assertSuccessToast($response, 'Challan withdrawn.');

        // Hard delete — gone for both parties.
        $this->assertDatabaseMissing('mailbox_challans', ['id' => $challan->id]);
    }

    public function test_issuer_cannot_withdraw_a_paid_citation(): void
    {
        [$issuer, $recipient] = $this->seedPair();
        $challan = Challan::factory()->paid()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
        ]);

        $this->actingAs($issuer)
            ->delete("/apps/our-mailbox/challans/{$challan->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('mailbox_challans', ['id' => $challan->id]);
    }

    public function test_recipient_cannot_withdraw_a_citation(): void
    {
        [$issuer, $recipient] = $this->seedPair();
        $challan = Challan::factory()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
        ]);

        // The recipient is not the issuer → cannot withdraw it.
        $this->actingAs($recipient)
            ->delete("/apps/our-mailbox/challans/{$challan->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('mailbox_challans', ['id' => $challan->id]);
    }

    public function test_available_actions_are_viewer_contextual(): void
    {
        [$issuer, $recipient] = $this->seedPair();
        $issued = Challan::factory()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
        ]);

        // Recipient of an issued row → [pay].
        $this->actingAs($recipient)
            ->get("/apps/our-mailbox/challans/{$issued->id}")
            ->assertInertia(fn (Assert $page) => $page
                ->where('challan.available_actions', ['pay'])
            );

        // Issuer of the same issued row → [delete] (withdraw before it's paid).
        $this->actingAs($issuer)
            ->get("/apps/our-mailbox/challans/{$issued->id}")
            ->assertInertia(fn (Assert $page) => $page
                ->where('challan.available_actions', ['delete'])
            );

        // A paid row → [] for everyone (terminal).
        $paid = Challan::factory()->paid()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
        ]);
        $this->actingAs($recipient)
            ->get("/apps/our-mailbox/challans/{$paid->id}")
            ->assertInertia(fn (Assert $page) => $page
                ->where('challan.available_actions', [])
            );
    }
}
