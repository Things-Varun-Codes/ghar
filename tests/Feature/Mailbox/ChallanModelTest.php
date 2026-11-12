<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Models\Challan;
use App\Shell\Models\User;
use Illuminate\Database\Eloquent\MassAssignmentException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChallanModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_ref_no_status_and_issuer_id_are_not_mass_assignable(): void
    {
        $attacker = User::factory()->create();
        $recipient = User::factory()->create();

        $challan = new Challan;

        try {
            $challan->fill([
                'recipient_id' => $recipient->id,
                'offence' => 'Replied with just k',
                'penalty' => '3 hugs',
                // Attempted tampering — all three must be rejected.
                'ref_no' => 'OC/1999/000001',
                'status' => Challan::STATUS_PAID,
                'issuer_id' => $attacker->id,
            ]);
            $this->fail('Expected MassAssignmentException for the guarded fields.');
        } catch (MassAssignmentException $e) {
            $this->assertStringContainsString('ref_no', $e->getMessage());
            $this->assertStringContainsString('status', $e->getMessage());
            $this->assertStringContainsString('issuer_id', $e->getMessage());
        }

        $this->assertNull($challan->ref_no);
        $this->assertNotSame(Challan::STATUS_PAID, $challan->status);
        $this->assertNull($challan->issuer_id);
        $this->assertSame($recipient->id, $challan->recipient_id);
    }
}
