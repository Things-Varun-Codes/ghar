<?php

namespace Tests\Feature\Shell;

use App\MiniApps\Corner\Models\Movie;
use App\MiniApps\Corner\Models\Song;
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
        Song::factory()->create(['added_by_user_id' => $this->me->id, 'thumbnail_url' => '/old.jpg', 'added_at' => now()->subDays(3)]);
        Movie::factory()->create(['added_by_user_id' => $this->me->id, 'poster_url' => '/new.jpg', 'added_at' => now()->subDay()]);
        Movie::factory()->create(['added_by_user_id' => $this->me->id, 'poster_url' => null, 'added_at' => now()]);

        $this->actingAs($this->me)
            ->get('/dashboard')
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('previews.our-corner.images', ['/new.jpg', '/old.jpg'])
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
                ->where('previews.our-mailbox.note', 'Dinner at 8?')
                ->where('previews.our-mailbox.note_from', 'From Partner')
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
            ->assertInertia(fn (AssertableInertia $page) => $page->missing('previews.our-mailbox'));
    }

    public function test_a_throwing_resolver_just_shows_no_glimpse(): void
    {
        app(DashboardSummaries::class)->registerPreview('our-corner', function (): array {
            throw new RuntimeException('boom');
        });

        $this->actingAs($this->me)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->missing('previews.our-corner'));
    }
}
