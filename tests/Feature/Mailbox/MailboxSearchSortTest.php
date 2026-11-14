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
use LogicException;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class MailboxSearchSortTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('s3');
    }

    /** @return array<string, array{string, string}> surface => [received-tab URL, list prop] */
    public static function surfaces(): array
    {
        return [
            'messages' => ['/apps/our-mailbox/messages?tab=received', 'messages'],
            'flowers' => ['/apps/our-mailbox/flowers?tab=received', 'bouquets'],
            'challans' => ['/apps/our-mailbox/challans?tab=received', 'challans'],
            'coupons' => ['/apps/our-mailbox/coupons?tab=received', 'coupons'],
        ];
    }

    /** One row from $from to $to, with $text in the surface's first search column. */
    private function row(User $from, User $to, string $text, ?Carbon $at = null): MailboxMessage|Bouquet|Challan|Coupon
    {
        $at ??= Carbon::now();

        return match ($this->dataName()) {
            'messages' => MailboxMessage::factory()->to($to)->create(['sender_id' => $from->id, 'body' => $text, 'posted_at' => $at]),
            'flowers' => Bouquet::factory()->to($to)->create(['sender_id' => $from->id, 'note' => $text, 'posted_at' => $at]),
            'challans' => Challan::factory()->create([
                'issuer_id' => $from->id, 'recipient_id' => $to->id, 'issued_at' => $at,
                'offence' => $text, 'penalty' => 'none', 'incident_place' => 'none', 'remarks' => 'none',
            ]),
            'coupons' => Coupon::factory()->create([
                'issuer_id' => $from->id, 'recipient_id' => $to->id, 'issued_at' => $at,
                'title' => $text, 'description' => 'none',
            ]),
            default => throw new LogicException('Unknown surface: '.$this->dataName()),
        };
    }

    #[DataProvider('surfaces')]
    public function test_search_narrows_rows_and_counts_and_echoes_q(string $url, string $prop): void
    {
        $viewer = User::factory()->create();
        $other = User::factory()->create();

        $match = $this->row($other, $viewer, 'About the anniversary trip');
        $this->row($other, $viewer, 'Just saying hi');

        $this->actingAs($viewer)
            ->get($url.'&q=anniversary')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has("{$prop}.data", 1)
                ->where("{$prop}.data.0.id", $match->id)
                ->where("{$prop}.counts.all", 1)
                ->where('q', 'anniversary'));
    }

    #[DataProvider('surfaces')]
    public function test_search_does_not_leak_outside_the_received_tab(string $url, string $prop): void
    {
        $viewer = User::factory()->create();
        $partner = User::factory()->create();
        $stranger = User::factory()->create();
        $term = 'Shared Search Term';

        // Sent by the viewer: belongs to the other tab.
        $this->row($viewer, $partner, "{$term} sent by viewer");
        // Between two other members: invisible to the viewer.
        $this->row($stranger, $partner, "{$term} between others");
        $visible = $this->row($partner, $viewer, "{$term} sent to viewer");

        $this->actingAs($viewer)
            ->get($url.'&q='.urlencode($term))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has("{$prop}.data", 1)
                ->where("{$prop}.data.0.id", $visible->id)
                ->where("{$prop}.counts.all", 1));
    }

    #[DataProvider('surfaces')]
    public function test_sort_is_recent_by_default_reversible_and_whitelisted(string $url, string $prop): void
    {
        $viewer = User::factory()->create();
        $other = User::factory()->create();

        $older = $this->row($other, $viewer, 'older', Carbon::now()->subDay());
        $newer = $this->row($other, $viewer, 'newer');

        foreach (['' => 'recent', '&sort=garbage' => 'recent', '&sort=oldest' => 'oldest'] as $query => $resolved) {
            [$first, $second] = $resolved === 'oldest' ? [$older, $newer] : [$newer, $older];

            $this->actingAs($viewer)
                ->get($url.$query)
                ->assertOk()
                ->assertInertia(fn ($page) => $page
                    ->where('sort', $resolved)
                    ->where('q', null)
                    ->where("{$prop}.data.0.id", $first->id)
                    ->where("{$prop}.data.1.id", $second->id));
        }
    }

    #[DataProvider('surfaces')]
    public function test_counts_degrade_without_a_status_column(string $url, string $prop): void
    {
        $viewer = User::factory()->create();
        $other = User::factory()->create();

        foreach (['one', 'two', 'three'] as $text) {
            $this->row($other, $viewer, $text);
        }

        $this->actingAs($viewer)
            ->get($url)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where("{$prop}.counts.all", 3)
                ->where("{$prop}.counts.active", 3)
                ->where("{$prop}.counts.done", 0));
    }

    /** @return array<string, array{class-string<Challan|Coupon>, string, string}> */
    public static function secondarySearchColumns(): array
    {
        return [
            'challan penalty' => [Challan::class, 'challans', 'penalty'],
            'challan incident place' => [Challan::class, 'challans', 'incident_place'],
            'challan remarks' => [Challan::class, 'challans', 'remarks'],
            'coupon description' => [Coupon::class, 'coupons', 'description'],
        ];
    }

    /** @param  class-string<Challan|Coupon>  $model */
    #[DataProvider('secondarySearchColumns')]
    public function test_search_matches_every_listed_column_on_the_issued_side(string $model, string $slug, string $column): void
    {
        $viewer = User::factory()->create();
        $other = User::factory()->create();

        $match = $model::factory()->create([
            'issuer_id' => $viewer->id,
            'recipient_id' => $other->id,
            $column => 'mentioned the anniversary trip',
        ]);
        $model::factory()->create([
            'issuer_id' => $viewer->id,
            'recipient_id' => $other->id,
            $column => 'nothing notable',
        ]);

        $this->actingAs($viewer)
            ->get("/apps/our-mailbox/{$slug}?tab=issued&q=anniversary")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('tab', 'issued')
                ->has("{$slug}.data", 1)
                ->where("{$slug}.data.0.id", $match->id));
    }
}
