<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Models\Citation;
use App\Shell\Models\User;
use Illuminate\Database\Eloquent\MassAssignmentException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CitationModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_ref_no_status_and_issuer_id_are_not_mass_assignable(): void
    {
        $attacker = User::factory()->create();
        $recipient = User::factory()->create();

        $citation = new Citation;

        try {
            $citation->fill([
                'recipient_id' => $recipient->id,
                'offence' => 'Replied with just k',
                'penalty' => '3 hugs',
                // Attempted tampering — all three must be rejected.
                'ref_no' => 'OC/1999/000001',
                'status' => Citation::STATUS_PAID,
                'issuer_id' => $attacker->id,
            ]);
            $this->fail('Expected MassAssignmentException for the guarded fields.');
        } catch (MassAssignmentException $e) {
            $this->assertStringContainsString('ref_no', $e->getMessage());
            $this->assertStringContainsString('status', $e->getMessage());
            $this->assertStringContainsString('issuer_id', $e->getMessage());
        }

        $this->assertNull($citation->ref_no);
        $this->assertNotSame(Citation::STATUS_PAID, $citation->status);
        $this->assertNull($citation->issuer_id);
        $this->assertSame($recipient->id, $citation->recipient_id);
    }

    public function test_visibility_scope_is_issuer_or_recipient_only(): void
    {
        $issuer = User::factory()->create();
        $recipient = User::factory()->create();
        $bystander = User::factory()->create();

        $citation = Citation::factory()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
        ]);

        $this->assertTrue(Citation::query()->visibleTo($issuer)->whereKey($citation->id)->exists());
        $this->assertTrue(Citation::query()->visibleTo($recipient)->whereKey($citation->id)->exists());
        $this->assertFalse(Citation::query()->visibleTo($bystander)->whereKey($citation->id)->exists());
    }

    public function test_each_side_and_party_check(): void
    {
        $issuer = User::factory()->create();
        $recipient = User::factory()->create();
        $bystander = User::factory()->create();

        $citation = Citation::factory()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
        ]);

        $this->assertSame([$citation->id], Citation::query()->issuedBy($issuer)->pluck('id')->all());
        $this->assertSame([], Citation::query()->issuedBy($recipient)->pluck('id')->all());
        $this->assertSame([$citation->id], Citation::query()->receivedBy($recipient)->pluck('id')->all());
        $this->assertSame([], Citation::query()->receivedBy($issuer)->pluck('id')->all());

        $this->assertTrue($citation->isParty($issuer));
        $this->assertTrue($citation->isParty($recipient));
        $this->assertFalse($citation->isParty($bystander));
    }
}
