<?php

namespace Tests\Feature\Shell;

use App\MiniApps\Corner\Models\Place;
use App\MiniApps\Corner\Models\Song;
use App\MiniApps\History\Models\Event;
use App\MiniApps\Mailbox\Models\Challan;
use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\Shell\Models\User;
use App\Shell\Services\DashboardSummaries;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class DashboardSummariesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        Carbon::setTestNow('2026-10-22 12:00:00');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_history_on_this_day_line(): void
    {
        $user = User::factory()->create();
        Event::factory()->create(['creator_id' => $user->id, 'title' => 'Lisbon trip', 'occurred_on' => '2023-10-22']);

        $this->actingAs($user)->get('/dashboard')
            ->assertInertia(fn ($p) => $p->where('summaries.our-history', 'On this day, 3 years ago: Lisbon trip'));
    }

    public function test_history_on_this_day_uses_singular_for_one_year(): void
    {
        $user = User::factory()->create();
        Event::factory()->create(['creator_id' => $user->id, 'title' => 'First dance', 'occurred_on' => '2025-10-22']);

        $this->actingAs($user)->get('/dashboard')
            ->assertInertia(fn ($p) => $p->where('summaries.our-history', 'On this day, 1 year ago: First dance'));
    }

    public function test_history_falls_back_to_last_moment(): void
    {
        $user = User::factory()->create();
        Event::factory()->create(['creator_id' => $user->id, 'title' => 'Dinner', 'occurred_on' => '2026-10-15']);
        Event::factory()->create(['creator_id' => $user->id, 'title' => 'Older', 'occurred_on' => '2026-03-01']);
        // A future-dated event must never win "last moment".
        Event::factory()->create(['creator_id' => $user->id, 'title' => 'Future', 'occurred_on' => '2026-12-25']);

        $this->actingAs($user)->get('/dashboard')
            ->assertInertia(fn ($p) => $p->where('summaries.our-history', 'Last moment: Dinner · 15 Oct 2026'));
    }

    public function test_history_line_is_absent_with_no_events(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get('/dashboard')
            ->assertInertia(fn ($p) => $p->missing('summaries.our-history'));
    }

    public function test_history_line_shows_moments_from_anyone_in_the_household(): void
    {
        $writer = User::factory()->create();
        $reader = User::factory()->create();
        Event::factory()->create(['creator_id' => $writer->id, 'title' => 'Shared', 'occurred_on' => '2026-10-10']);

        $this->actingAs($reader)->get('/dashboard')
            ->assertInertia(fn ($p) => $p->where('summaries.our-history', 'Last moment: Shared · 10 Oct 2026'));
    }

    public function test_corner_line_is_latest_added_across_lists(): void
    {
        $user = User::factory()->create();
        Song::factory()->create(['added_by_user_id' => $user->id, 'title' => 'Old song', 'added_at' => '2026-10-01 10:00:00']);
        Place::factory()->create(['added_by_user_id' => $user->id, 'title' => 'Blue Tokai', 'added_at' => '2026-10-20 10:00:00']);

        $this->actingAs($user)->get('/dashboard')
            ->assertInertia(fn ($p) => $p->where('summaries.our-corner', 'Latest: Blue Tokai'));
    }

    public function test_corner_line_is_absent_with_no_items(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get('/dashboard')
            ->assertInertia(fn ($p) => $p->missing('summaries.our-corner'));
    }

    public function test_corner_line_shows_items_from_anyone_in_the_household(): void
    {
        $adder = User::factory()->create();
        $reader = User::factory()->create();
        Place::factory()->create(['added_by_user_id' => $adder->id, 'title' => 'Blue Tokai', 'added_at' => '2026-10-21 10:00:00']);

        $this->actingAs($reader)->get('/dashboard')
            ->assertInertia(fn ($p) => $p->where('summaries.our-corner', 'Latest: Blue Tokai'));
    }

    public function test_mailbox_line_counts_unread_notes_and_challans_to_pay(): void
    {
        $viewer = User::factory()->create();
        $other = User::factory()->create();
        MailboxMessage::factory()->count(3)->to($viewer)->create(['sender_id' => $other->id]);
        // Read + other-recipient rows must not count.
        MailboxMessage::factory()->to($viewer, read: true)->create(['sender_id' => $other->id]);
        MailboxMessage::factory()->to($other)->create(['sender_id' => $viewer->id]);
        Challan::factory()->create(['issuer_id' => $other->id, 'recipient_id' => $viewer->id]);

        $this->actingAs($viewer)->get('/dashboard')
            ->assertInertia(fn ($p) => $p->where('summaries.our-mailbox', '3 unread notes · 1 challan to pay'));
    }

    public function test_mailbox_line_grammar(): void
    {
        $viewer = User::factory()->create();
        $other = User::factory()->create();

        $this->actingAs($viewer)->get('/dashboard')
            ->assertInertia(fn ($p) => $p->where('summaries.our-mailbox', 'All caught up'));

        MailboxMessage::factory()->to($viewer)->create(['sender_id' => $other->id]);
        $this->actingAs($viewer)->get('/dashboard')
            ->assertInertia(fn ($p) => $p->where('summaries.our-mailbox', '1 unread note'));

        MailboxMessage::query()->delete();
        Challan::factory()->count(2)->create(['issuer_id' => $other->id, 'recipient_id' => $viewer->id]);
        $this->actingAs($viewer)->get('/dashboard')
            ->assertInertia(fn ($p) => $p->where('summaries.our-mailbox', '2 challans to pay'));
    }

    public function test_a_throwing_resolver_is_omitted_and_dashboard_still_renders(): void
    {
        Config::set('miniapps', [$this->fakeApp('boom', true)]);
        app(DashboardSummaries::class)->register('boom', function (User $u): ?string {
            throw new \RuntimeException('resolver exploded');
        });

        $this->actingAs(User::factory()->create())->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn ($p) => $p->missing('summaries.boom'));
    }

    public function test_a_disabled_app_is_never_resolved(): void
    {
        Config::set('miniapps', [$this->fakeApp('sleepy', false)]);
        $called = false;
        app(DashboardSummaries::class)->register('sleepy', function (User $u) use (&$called): string {
            $called = true;

            return 'should not appear';
        });

        $this->actingAs(User::factory()->create())->get('/dashboard')
            ->assertInertia(fn ($p) => $p->missing('summaries.sleepy'));

        $this->assertFalse($called, 'a disabled registry entry must never have its resolver invoked');
    }

    public function test_an_empty_resolver_result_is_omitted(): void
    {
        Config::set('miniapps', [$this->fakeApp('quiet', true)]);
        app(DashboardSummaries::class)->register('quiet', fn (User $u): string => '');

        $this->actingAs(User::factory()->create())->get('/dashboard')
            ->assertInertia(fn ($p) => $p->missing('summaries.quiet'));
    }

    /** @return array<string, mixed> */
    private function fakeApp(string $slug, bool $enabled): array
    {
        return [
            'name' => ucfirst($slug),
            'slug' => $slug,
            'route' => "/apps/{$slug}",
            'icon' => 'map',
            'description' => 'Fixture',
            'enabled' => $enabled,
            'admin_only' => false,
        ];
    }
}
