<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Models\Citation;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CitationAuthorizationTest extends TestCase
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
            ->from('/apps/our-exchange/citations')
            ->post('/apps/our-exchange/citations', [
                'penalty' => '',
            ])
            ->assertSessionHasErrors(['offence', 'penalty']);

        $this->assertDatabaseCount('mailbox_citations', 0);
    }

    public function test_issue_rejects_over_length_offence(): void
    {
        [$issuer] = $this->seedPair();

        $this->actingAs($issuer)
            ->from('/apps/our-exchange/citations')
            ->post('/apps/our-exchange/citations', [
                'offence' => str_repeat('a', 121),
                'penalty' => '3 hugs',
            ])
            ->assertSessionHasErrors('offence');

        $this->assertDatabaseCount('mailbox_citations', 0);
    }

    public function test_issue_rejects_over_length_penalty(): void
    {
        [$issuer] = $this->seedPair();

        $this->actingAs($issuer)
            ->from('/apps/our-exchange/citations')
            ->post('/apps/our-exchange/citations', [
                'offence' => 'Left on read',
                'penalty' => str_repeat('b', 81),
            ])
            ->assertSessionHasErrors('penalty');

        $this->assertDatabaseCount('mailbox_citations', 0);
    }

    public function test_ref_no_status_issuer_injection_is_ignored(): void
    {
        Notification::fake();
        [$issuer, $recipient] = $this->seedPair();

        $this->actingAs($issuer)->post('/apps/our-exchange/citations', [
            'recipient_ids' => [$recipient->id],
            'offence' => 'Replied with just k',
            'penalty' => '3 kisses',
            // Injection attempts — all must be ignored (server sets them).
            'ref_no' => 'OC/1999/000001',
            'status' => Citation::STATUS_PAID,
            'issuer_id' => $recipient->id,
        ]);

        $citation = Citation::firstOrFail();
        $this->assertNotSame('OC/1999/000001', $citation->ref_no);
        $this->assertSame(Citation::STATUS_ISSUED, $citation->status);
        $this->assertSame($issuer->id, $citation->issuer_id);
    }

    public function test_non_recipient_cannot_pay(): void
    {
        [$issuer, $recipient] = $this->seedPair();
        $citation = Citation::factory()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
        ]);

        // The issuer is not the recipient → cannot pay their own citation.
        $this->actingAs($issuer)
            ->patch("/apps/our-exchange/citations/{$citation->id}/pay")
            ->assertForbidden();

        $this->assertSame(Citation::STATUS_ISSUED, $citation->fresh()->status);
    }

    public function test_paying_an_already_paid_row_is_forbidden(): void
    {
        [$issuer, $recipient] = $this->seedPair();
        $citation = Citation::factory()->paid()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
        ]);

        // Paid is terminal — even the recipient can't pay again (policy gate).
        $this->actingAs($recipient)
            ->patch("/apps/our-exchange/citations/{$citation->id}/pay")
            ->assertForbidden();

        $this->assertSame(Citation::STATUS_PAID, $citation->fresh()->status);
    }

    public function test_issuer_can_withdraw_an_unpaid_citation(): void
    {
        [$issuer, $recipient] = $this->seedPair();
        $citation = Citation::factory()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
        ]);

        $response = $this->actingAs($issuer)
            ->delete("/apps/our-exchange/citations/{$citation->id}")
            ->assertRedirect('/apps/our-exchange/citations');
        $this->assertSuccessToast($response, 'Citation withdrawn.');

        // Hard delete — gone for both parties.
        $this->assertDatabaseMissing('mailbox_citations', ['id' => $citation->id]);
    }

    public function test_issuer_cannot_withdraw_a_paid_citation(): void
    {
        [$issuer, $recipient] = $this->seedPair();
        $citation = Citation::factory()->paid()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
        ]);

        $this->actingAs($issuer)
            ->delete("/apps/our-exchange/citations/{$citation->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('mailbox_citations', ['id' => $citation->id]);
    }

    public function test_recipient_cannot_withdraw_a_citation(): void
    {
        [$issuer, $recipient] = $this->seedPair();
        $citation = Citation::factory()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
        ]);

        // The recipient is not the issuer → cannot withdraw it.
        $this->actingAs($recipient)
            ->delete("/apps/our-exchange/citations/{$citation->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('mailbox_citations', ['id' => $citation->id]);
    }

    public function test_available_actions_are_viewer_contextual(): void
    {
        [$issuer, $recipient] = $this->seedPair();
        $issued = Citation::factory()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
        ]);

        // Recipient of an issued row → [pay].
        $this->actingAs($recipient)
            ->get("/apps/our-exchange/citations/{$issued->id}")
            ->assertInertia(fn (Assert $page) => $page
                ->component('MiniApps/Mailbox/Pages/Citations/Show')
                ->where('citation.ref_no', $issued->ref_no)
                ->where('citation.status', Citation::STATUS_ISSUED)
                ->where('citation.available_actions', ['pay'])
            );

        // Issuer of the same issued row → [delete] (withdraw before it's paid).
        $this->actingAs($issuer)
            ->get("/apps/our-exchange/citations/{$issued->id}")
            ->assertInertia(fn (Assert $page) => $page
                ->where('citation.available_actions', ['delete'])
            );

        // A paid row → [] for everyone (terminal).
        $paid = Citation::factory()->paid()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
        ]);
        $this->actingAs($recipient)
            ->get("/apps/our-exchange/citations/{$paid->id}")
            ->assertInertia(fn (Assert $page) => $page
                ->where('citation.available_actions', [])
            );
    }
}
