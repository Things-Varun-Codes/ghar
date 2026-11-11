<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Models\Challan;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ChallanShowTest extends TestCase
{
    use RefreshDatabase;

    private function seedChallan(): array
    {
        $issuer = User::factory()->create();
        $recipient = User::factory()->create();
        $challan = Challan::factory()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
        ]);

        return [$issuer, $recipient, $challan];
    }

    public function test_recipient_can_view_with_pay_action(): void
    {
        [, $recipient, $challan] = $this->seedChallan();

        $this->actingAs($recipient)
            ->get("/apps/our-mailbox/challans/{$challan->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('MiniApps/Mailbox/Pages/Challans/Show')
                ->where('challan.ref_no', $challan->ref_no)
                ->where('challan.status', Challan::STATUS_ISSUED)
                ->where('challan.available_actions', ['pay'])
            );
    }

    public function test_issuer_can_view_with_withdraw_action_on_issued_row(): void
    {
        [$issuer, , $challan] = $this->seedChallan();

        // The issuer can withdraw an unpaid citation (delete), but never pay it.
        $this->actingAs($issuer)
            ->get("/apps/our-mailbox/challans/{$challan->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('challan.available_actions', ['delete'])
            );
    }

    public function test_third_party_is_forbidden(): void
    {
        [, , $challan] = $this->seedChallan();
        $stranger = User::factory()->create();

        $this->actingAs($stranger)
            ->get("/apps/our-mailbox/challans/{$challan->id}")
            ->assertForbidden();
    }
}
