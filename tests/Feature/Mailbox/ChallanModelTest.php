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

    public function test_factory_persists_across_both_states(): void
    {
        Challan::factory()->create();
        Challan::factory()->paid()->create();

        $this->assertSame(2, Challan::count());

        $paid = Challan::where('status', Challan::STATUS_PAID)->firstOrFail();
        $this->assertSame(Challan::STATUS_PAID, $paid->status);
        $this->assertNotNull($paid->settled_at);
    }

    public function test_visibility_scope_is_issuer_or_recipient_only(): void
    {
        $issuer = User::factory()->create();
        $recipient = User::factory()->create();
        $bystander = User::factory()->create();

        $challan = Challan::factory()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
        ]);

        $this->assertTrue(Challan::query()->visibleTo($issuer)->whereKey($challan->id)->exists());
        $this->assertTrue(Challan::query()->visibleTo($recipient)->whereKey($challan->id)->exists());
        $this->assertFalse(Challan::query()->visibleTo($bystander)->whereKey($challan->id)->exists());
    }

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
