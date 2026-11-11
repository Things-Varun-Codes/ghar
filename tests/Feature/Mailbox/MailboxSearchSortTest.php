<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Models\Bouquet;
use App\MiniApps\Mailbox\Models\Challan;
use App\MiniApps\Mailbox\Models\Coupon;
use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MailboxSearchSortTest extends TestCase
{
    use RefreshDatabase;

    public function test_messages_search_narrows_data_and_emits_q_prop(): void
    {
        $viewer = User::factory()->create();
        $sender = User::factory()->create();

        $match = MailboxMessage::factory()->to($viewer)->create([
            'sender_id' => $sender->id,
            'body' => 'A note about the anniversary trip',
        ]);
        MailboxMessage::factory()->to($viewer)->create([
            'sender_id' => $sender->id,
            'body' => 'Just saying hi',
        ]);

        $this->actingAs($viewer)
            ->get('/apps/our-mailbox/messages?tab=received&q=anniversary')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('messages.data', 1)
                ->where('messages.data.0.id', $match->id)
                ->where('q', 'anniversary'));
    }

    public function test_messages_counts_degrade_without_a_status_column(): void
    {
        $viewer = User::factory()->create();
        $sender = User::factory()->create();

        MailboxMessage::factory()->count(3)->to($viewer)->create([
            'sender_id' => $sender->id,
        ]);

        $this->actingAs($viewer)
            ->get('/apps/our-mailbox/messages?tab=received')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('messages.counts.all', 3)
                ->where('messages.counts.active', 3)
                ->where('messages.counts.done', 0));
    }

    public function test_messages_sort_oldest_reverses_the_default_order(): void
    {
        $viewer = User::factory()->create();
        $sender = User::factory()->create();

        $older = MailboxMessage::factory()->to($viewer)->create([
            'sender_id' => $sender->id,
            'posted_at' => Carbon::now()->subDay(),
        ]);
        $newer = MailboxMessage::factory()->to($viewer)->create([
            'sender_id' => $sender->id,
            'posted_at' => Carbon::now(),
        ]);

        $this->actingAs($viewer)
            ->get('/apps/our-mailbox/messages?tab=received&sort=oldest')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('sort', 'oldest')
                ->where('messages.data.0.id', $older->id)
                ->where('messages.data.1.id', $newer->id));
    }

    public function test_messages_sort_garbage_falls_back_to_recent(): void
    {
        $viewer = User::factory()->create();
        $sender = User::factory()->create();

        $older = MailboxMessage::factory()->to($viewer)->create([
            'sender_id' => $sender->id,
            'posted_at' => Carbon::now()->subDay(),
        ]);
        $newer = MailboxMessage::factory()->to($viewer)->create([
            'sender_id' => $sender->id,
            'posted_at' => Carbon::now(),
        ]);

        $this->actingAs($viewer)
            ->get('/apps/our-mailbox/messages?tab=received&sort=garbage')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('sort', 'recent')
                ->where('messages.data.0.id', $newer->id)
                ->where('messages.data.1.id', $older->id));
    }

    public function test_messages_default_order_is_unchanged_when_sort_is_absent(): void
    {
        $viewer = User::factory()->create();
        $sender = User::factory()->create();

        $older = MailboxMessage::factory()->to($viewer)->create([
            'sender_id' => $sender->id,
            'posted_at' => Carbon::now()->subDay(),
        ]);
        $newer = MailboxMessage::factory()->to($viewer)->create([
            'sender_id' => $sender->id,
            'posted_at' => Carbon::now(),
        ]);

        $this->actingAs($viewer)
            ->get('/apps/our-mailbox/messages?tab=received')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('sort', 'recent')
                ->where('q', null)
                ->where('messages.data.0.id', $newer->id)
                ->where('messages.data.1.id', $older->id));
    }

    public function test_flowers_search_narrows_data_on_the_note_column(): void
    {
        Storage::fake('s3');

        $viewer = User::factory()->create();
        $sender = User::factory()->create();

        $match = Bouquet::factory()->to($viewer)->create([
            'sender_id' => $sender->id,
            'note' => 'Happy anniversary, my love',
        ]);
        Bouquet::factory()->to($viewer)->create([
            'sender_id' => $sender->id,
            'note' => 'Just because',
        ]);

        $this->actingAs($viewer)
            ->get('/apps/our-mailbox/flowers?tab=received&q=anniversary')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('bouquets.data', 1)
                ->where('bouquets.data.0.id', $match->id)
                ->where('q', 'anniversary'));
    }

    public function test_flowers_sort_oldest_reverses_the_default_order(): void
    {
        Storage::fake('s3');

        $viewer = User::factory()->create();
        $sender = User::factory()->create();

        $older = Bouquet::factory()->to($viewer)->create([
            'sender_id' => $sender->id,
            'note' => 'older bouquet',
            'posted_at' => Carbon::now()->subDay(),
        ]);
        $newer = Bouquet::factory()->to($viewer)->create([
            'sender_id' => $sender->id,
            'note' => 'newer bouquet',
            'posted_at' => Carbon::now(),
        ]);

        $this->actingAs($viewer)
            ->get('/apps/our-mailbox/flowers?tab=received&sort=oldest')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('sort', 'oldest')
                ->where('bouquets.data.0.id', $older->id)
                ->where('bouquets.data.1.id', $newer->id));
    }

    public function test_messages_search_does_not_leak_outside_the_received_tab_scope(): void
    {
        $viewer = User::factory()->create();
        $partner = User::factory()->create();
        $tester = User::factory()->create();

        $term = 'Shared Search Term';

        // Row A — self-authored, excluded by the tab-scope clause.
        MailboxMessage::factory()->to($partner)->create([
            'sender_id' => $viewer->id,
            'body' => "{$term} sent by viewer",
        ]);

        // Row B — between two other members; the viewer is neither sender  nor recipient, so
        // it is invisible to them.
        MailboxMessage::factory()->to($partner)->create([
            'sender_id' => $tester->id,
            'body' => "{$term} sent by tester",
        ]);

        // Row C — the one row that must come back.
        $visible = MailboxMessage::factory()->to($viewer)->create([
            'sender_id' => $partner->id,
            'body' => "{$term} sent by partner",
        ]);

        $this->actingAs($viewer)
            ->get('/apps/our-mailbox/messages?tab=received&q='.urlencode($term))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('messages.data', 1)
                ->where('messages.data.0.id', $visible->id)
                ->where('messages.counts.all', 1));
    }

    public function test_flowers_search_does_not_leak_outside_the_received_tab_scope(): void
    {
        Storage::fake('s3');

        $viewer = User::factory()->create();
        $partner = User::factory()->create();
        $tester = User::factory()->create();

        $term = 'Shared Search Term';

        // Row A — self-authored, excluded by the tab-scope clause.
        Bouquet::factory()->to($partner)->create([
            'sender_id' => $viewer->id,
            'note' => "{$term} sent by viewer",
        ]);

        // Row B — between two other members; the viewer is neither sender  nor recipient, so
        // it is invisible to them.
        Bouquet::factory()->to($partner)->create([
            'sender_id' => $tester->id,
            'note' => "{$term} sent by tester",
        ]);

        // Row C — the one row that must come back.
        $visible = Bouquet::factory()->to($viewer)->create([
            'sender_id' => $partner->id,
            'note' => "{$term} sent by partner",
        ]);

        $this->actingAs($viewer)
            ->get('/apps/our-mailbox/flowers?tab=received&q='.urlencode($term))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('bouquets.data', 1)
                ->where('bouquets.data.0.id', $visible->id)
                ->where('bouquets.counts.all', 1));
    }

    public function test_challans_search_narrows_received_data_and_emits_q_prop(): void
    {
        $viewer = User::factory()->create();
        $other = User::factory()->create();

        $match = Challan::factory()->create([
            'issuer_id' => $other->id,
            'recipient_id' => $viewer->id,
            'offence' => 'Forgot our anniversary again',
            'penalty' => 'fifty push-ups',
            'incident_place' => 'kitchen',
            'remarks' => 'playful citation',
        ]);
        Challan::factory()->create([
            'issuer_id' => $other->id,
            'recipient_id' => $viewer->id,
            'offence' => 'Left the dishes undone',
            'penalty' => 'wash the dishes',
            'incident_place' => 'sink',
            'remarks' => 'usual complaint',
        ]);

        $this->actingAs($viewer)
            ->get('/apps/our-mailbox/challans?q=anniversary')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('challans.data', 1)
                ->where('challans.data.0.id', $match->id)
                ->where('challans.counts.all', 1)
                ->where('q', 'anniversary'));
    }

    public function test_challans_search_matches_the_remarks_column_on_the_issued_side(): void
    {
        $viewer = User::factory()->create();
        $other = User::factory()->create();

        $match = Challan::factory()->create([
            'issuer_id' => $viewer->id,
            'recipient_id' => $other->id,
            'offence' => 'Left the dishes undone',
            'penalty' => 'wash the dishes',
            'incident_place' => 'sink',
            'remarks' => 'mentioned the anniversary trip',
        ]);
        Challan::factory()->create([
            'issuer_id' => $viewer->id,
            'recipient_id' => $other->id,
            'offence' => 'Snored loudly',
            'penalty' => 'buy earplugs',
            'incident_place' => 'bedroom',
            'remarks' => 'nothing notable',
        ]);

        $this->actingAs($viewer)
            ->get('/apps/our-mailbox/challans?tab=issued&q=anniversary')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('tab', 'issued')
                ->has('challans.data', 1)
                ->where('challans.data.0.id', $match->id));
    }

    public function test_challans_sort_oldest_reverses_the_default_order(): void
    {
        $viewer = User::factory()->create();
        $other = User::factory()->create();

        $older = Challan::factory()->create([
            'issuer_id' => $other->id,
            'recipient_id' => $viewer->id,
            'issued_at' => Carbon::now()->subDay(),
        ]);
        $newer = Challan::factory()->create([
            'issuer_id' => $other->id,
            'recipient_id' => $viewer->id,
            'issued_at' => Carbon::now(),
        ]);

        $this->actingAs($viewer)
            ->get('/apps/our-mailbox/challans?sort=oldest')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('sort', 'oldest')
                ->where('challans.data.0.id', $older->id)
                ->where('challans.data.1.id', $newer->id));
    }

    public function test_challans_default_order_is_unchanged_when_sort_is_absent(): void
    {
        $viewer = User::factory()->create();
        $other = User::factory()->create();

        $older = Challan::factory()->create([
            'issuer_id' => $other->id,
            'recipient_id' => $viewer->id,
            'issued_at' => Carbon::now()->subDay(),
        ]);
        $newer = Challan::factory()->create([
            'issuer_id' => $other->id,
            'recipient_id' => $viewer->id,
            'issued_at' => Carbon::now(),
        ]);

        $this->actingAs($viewer)
            ->get('/apps/our-mailbox/challans')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('sort', 'recent')
                ->where('q', null)
                ->where('challans.data.0.id', $newer->id)
                ->where('challans.data.1.id', $older->id));
    }

    public function test_challans_search_does_not_leak_outside_the_received_tab_scope(): void
    {
        $viewer = User::factory()->create();
        $partner = User::factory()->create();
        $tester = User::factory()->create();

        $term = 'Shared Search Term';

        // Row A — self-issued (to the partner), excluded by the tab-scope  clause. Matches
        // ONLY penalty.
        Challan::factory()->create([
            'issuer_id' => $viewer->id,
            'recipient_id' => $partner->id,
            'offence' => 'no match here',
            'penalty' => $term,
            'incident_place' => 'no match here',
            'remarks' => 'no match here',
        ]);

        // Row B — between two other members, invisible to the viewer.  Matches ONLY remarks.
        Challan::factory()->create([
            'issuer_id' => $tester->id,
            'recipient_id' => $partner->id,
            'offence' => 'no match here',
            'penalty' => 'no match here',
            'incident_place' => 'no match here',
            'remarks' => $term,
        ]);

        // Row C — the one row that must come back. Matches on offence.
        $visible = Challan::factory()->create([
            'issuer_id' => $partner->id,
            'recipient_id' => $viewer->id,
            'offence' => $term,
            'penalty' => 'no match here',
            'incident_place' => 'no match here',
            'remarks' => 'no match here',
        ]);

        $this->actingAs($viewer)
            ->get('/apps/our-mailbox/challans?q='.urlencode($term))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('challans.data', 1)
                ->where('challans.data.0.id', $visible->id)
                ->where('challans.counts.all', 1));
    }

    public function test_coupons_search_narrows_received_data_on_the_title_column(): void
    {
        $viewer = User::factory()->create();
        $other = User::factory()->create();

        $match = Coupon::factory()->create([
            'issuer_id' => $other->id,
            'recipient_id' => $viewer->id,
            'title' => 'Anniversary breakfast in bed',
            'description' => 'One free lie-in',
        ]);
        Coupon::factory()->create([
            'issuer_id' => $other->id,
            'recipient_id' => $viewer->id,
            'title' => 'One free car wash',
            'description' => 'Redeemable any weekend',
        ]);

        $this->actingAs($viewer)
            ->get('/apps/our-mailbox/coupons?q=anniversary')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('coupons.data', 1)
                ->where('coupons.data.0.id', $match->id)
                ->where('coupons.counts.all', 1)
                ->where('q', 'anniversary'));
    }

    public function test_coupons_search_matches_the_description_column_on_the_issued_side(): void
    {
        $viewer = User::factory()->create();
        $other = User::factory()->create();

        $match = Coupon::factory()->create([
            'issuer_id' => $viewer->id,
            'recipient_id' => $other->id,
            'title' => 'One free car wash',
            'description' => 'Good for our anniversary weekend',
        ]);
        Coupon::factory()->create([
            'issuer_id' => $viewer->id,
            'recipient_id' => $other->id,
            'title' => 'One lazy Sunday',
            'description' => 'Nothing notable',
        ]);

        $this->actingAs($viewer)
            ->get('/apps/our-mailbox/coupons?tab=issued&q=anniversary')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('tab', 'issued')
                ->has('coupons.data', 1)
                ->where('coupons.data.0.id', $match->id));
    }

    public function test_coupons_sort_oldest_reverses_the_default_order(): void
    {
        $viewer = User::factory()->create();
        $other = User::factory()->create();

        $older = Coupon::factory()->create([
            'issuer_id' => $other->id,
            'recipient_id' => $viewer->id,
            'issued_at' => Carbon::now()->subDay(),
        ]);
        $newer = Coupon::factory()->create([
            'issuer_id' => $other->id,
            'recipient_id' => $viewer->id,
            'issued_at' => Carbon::now(),
        ]);

        $this->actingAs($viewer)
            ->get('/apps/our-mailbox/coupons?sort=oldest')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('sort', 'oldest')
                ->where('coupons.data.0.id', $older->id)
                ->where('coupons.data.1.id', $newer->id));
    }

    public function test_coupons_sort_garbage_falls_back_to_recent(): void
    {
        $viewer = User::factory()->create();
        $other = User::factory()->create();

        $older = Coupon::factory()->create([
            'issuer_id' => $other->id,
            'recipient_id' => $viewer->id,
            'issued_at' => Carbon::now()->subDay(),
        ]);
        $newer = Coupon::factory()->create([
            'issuer_id' => $other->id,
            'recipient_id' => $viewer->id,
            'issued_at' => Carbon::now(),
        ]);

        $this->actingAs($viewer)
            ->get('/apps/our-mailbox/coupons?sort=garbage')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('sort', 'recent')
                ->where('coupons.data.0.id', $newer->id)
                ->where('coupons.data.1.id', $older->id));
    }

    public function test_coupons_search_does_not_leak_outside_the_received_tab_scope(): void
    {
        $viewer = User::factory()->create();
        $partner = User::factory()->create();
        $tester = User::factory()->create();

        $term = 'Shared Search Term';

        // Row A — self-issued (to the partner), excluded by the tab-scope  clause. Matches
        // ONLY description.
        Coupon::factory()->create([
            'issuer_id' => $viewer->id,
            'recipient_id' => $partner->id,
            'title' => 'no match here',
            'description' => $term,
        ]);

        // Row B — between two other members, invisible to the viewer.  Matches ONLY
        // description.
        Coupon::factory()->create([
            'issuer_id' => $tester->id,
            'recipient_id' => $partner->id,
            'title' => 'no match here',
            'description' => $term,
        ]);

        // Row C — the one row that must come back. Matches on title.
        $visible = Coupon::factory()->create([
            'issuer_id' => $partner->id,
            'recipient_id' => $viewer->id,
            'title' => $term,
            'description' => 'no match here',
        ]);

        $this->actingAs($viewer)
            ->get('/apps/our-mailbox/coupons?q='.urlencode($term))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('coupons.data', 1)
                ->where('coupons.data.0.id', $visible->id)
                ->where('coupons.counts.all', 1));
    }
}
