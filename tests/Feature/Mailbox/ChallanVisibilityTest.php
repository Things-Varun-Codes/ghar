<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Models\Challan;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ChallanVisibilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_bystander_sees_neither_side(): void
    {
        $issuer = User::factory()->create();
        $recipient = User::factory()->create();
        $bystander = User::factory()->create();

        Challan::factory()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
        ]);

        foreach (['received', 'issued'] as $tab) {
            $this->actingAs($bystander)
                ->get('/apps/our-mailbox/challans?tab='.$tab)
                ->assertInertia(fn (Assert $page) => $page->has('challans.data', 0));
        }

        $this->actingAs($recipient)
            ->get('/apps/our-mailbox/challans')
            ->assertInertia(fn (Assert $page) => $page->has('challans.data', 1));
    }

    public function test_index_returns_received_and_issued_split(): void
    {
        $primary = User::factory()->create();
        $partner = User::factory()->create();

        // primary issued one to partner, partner issued one to primary.
        $primaryIssued = Challan::factory()->create(['issuer_id' => $primary->id, 'recipient_id' => $partner->id]);
        $primaryReceived = Challan::factory()->create(['issuer_id' => $partner->id, 'recipient_id' => $primary->id]);

        // Received tab (default): the citation the partner issued TO primary.
        $this->actingAs($primary)
            ->get('/apps/our-mailbox/challans')
            ->assertInertia(fn (Assert $page) => $page
                ->where('tab', 'received')
                ->has('challans.data', 1)
                ->where('challans.data.0.id', $primaryReceived->id)
            );

        // Issued tab: the citation primary issued to the partner.
        $this->actingAs($primary)
            ->get('/apps/our-mailbox/challans?tab=issued')
            ->assertInertia(fn (Assert $page) => $page
                ->where('tab', 'issued')
                ->has('challans.data', 1)
                ->where('challans.data.0.id', $primaryIssued->id)
            );
    }
}
