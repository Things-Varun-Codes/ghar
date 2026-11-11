<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Models\Challan;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MailboxLandingChallanTest extends TestCase
{
    use RefreshDatabase;

    public function test_landing_summary_includes_challans_count_and_action_needed(): void
    {
        $user = User::factory()->create();
        $partner = User::factory()->create();

        // Two received by the user (count these); one issued by the user  (must NOT count —
        // challans count is received-only).
        Challan::factory()->create(['issuer_id' => $partner->id, 'recipient_id' => $user->id]); // received, issued → action needed
        Challan::factory()->paid()->create(['issuer_id' => $partner->id, 'recipient_id' => $user->id]); // received, paid → settled
        Challan::factory()->create(['issuer_id' => $user->id, 'recipient_id' => $partner->id]); // issued by user → not received, must NOT count  One not involving the user at all → must
        // NOT count.
        $stranger = User::factory()->create();
        Challan::factory()->create(['issuer_id' => $stranger->id, 'recipient_id' => $partner->id]);

        $this->actingAs($user)
            ->get('/apps/our-mailbox')
            ->assertInertia(fn (Assert $page) => $page
                ->component('MiniApps/Mailbox/Pages/Landing')
                ->where('mailboxSummary.counts.challans', 2)
                ->where('mailboxSummary.challans_action_needed', 1)
                // The sibling messages count remains present.
                ->has('mailboxSummary.counts.messages')
            );
    }
}
