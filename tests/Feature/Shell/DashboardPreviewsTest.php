<?php

namespace Tests\Feature\Shell;

use App\MiniApps\Corner\Models\CornerList;
use App\MiniApps\Corner\Models\Item;
use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\Shell\Models\User;
use App\Shell\Services\DashboardSummaries;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use RuntimeException;
use Tests\TestCase;

class DashboardPreviewsTest extends TestCase
{
    use RefreshDatabase;

    private User $me;

    private User $partner;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);

        $this->me = User::factory()->create();
        $this->partner = User::factory()->create(['name' => 'Partner']);
    }

    public function test_previews_are_empty_for_a_new_account(): void
    {
        $this->actingAs($this->me)
            ->get('/dashboard')
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Shell/Pages/Dashboard')
                ->where('previews', [])
            );
    }

    public function test_corner_door_shows_the_newest_covers_first(): void
    {
        $songs = CornerList::factory()->songs()->create();
        $movies = CornerList::factory()->movies()->create();
        $plain = CornerList::factory()->create();
        $old = Item::factory()->create(['list_id' => $songs->id, 'added_by_user_id' => $this->me->id, 'image_url' => 'https://images.example.com/old.jpg', 'added_at' => now()->subDays(3)]);
        $new = Item::factory()->create(['list_id' => $movies->id, 'added_by_user_id' => $this->partner->id, 'image_url' => 'https://images.example.com/new.jpg', 'added_at' => now()->subDay()]);
        Item::factory()->create(['list_id' => $movies->id, 'added_by_user_id' => $this->me->id, 'image_url' => null, 'added_at' => now()]);
        // The same cover twice shows once.
        Item::factory()->create(['list_id' => $songs->id, 'added_by_user_id' => $this->me->id, 'image_url' => 'https://images.example.com/new.jpg', 'added_at' => now()->subDays(2)]);
        Item::factory()->create(['list_id' => $plain->id, 'added_by_user_id' => $this->me->id, 'added_at' => now()]);

        $this->actingAs($this->me)
            ->get('/dashboard')
            ->assertInertia(fn (AssertableInertia $page) => $page
                // Drawn through this app's picture route, never from the other site.
                ->where('previews.our-shelf.images', [$new->pictureUrl(), $old->pictureUrl()])
            );
    }

    public function test_mailbox_door_shows_the_latest_note_without_marking_it_read(): void
    {
        $note = MailboxMessage::factory()->to($this->me)->create([
            'sender_id' => $this->partner->id,
            'body' => 'Dinner at 8?',
        ]);

        $this->actingAs($this->me)
            ->get('/dashboard')
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('previews.our-exchange.note', 'Dinner at 8?')
                ->where('previews.our-exchange.note_from', 'From Partner')
            );

        $this->assertNull($note->readAtFor($this->me));
    }

    public function test_mailbox_door_never_shows_a_note_i_sent(): void
    {
        MailboxMessage::factory()->to($this->partner)->create([
            'sender_id' => $this->me->id,
            'body' => 'Mine',
        ]);

        $this->actingAs($this->me)
            ->get('/dashboard')
            ->assertInertia(fn (AssertableInertia $page) => $page->missing('previews.our-exchange'));
    }

    public function test_a_throwing_resolver_just_shows_no_glimpse(): void
    {
        app(DashboardSummaries::class)->registerPreview('our-shelf', function (): array {
            throw new RuntimeException('boom');
        });

        $this->actingAs($this->me)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->missing('previews.our-shelf'));
    }
}
