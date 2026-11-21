<?php

namespace Tests\Feature\Shell;

use App\MiniApps\Corner\Models\CornerList;
use App\MiniApps\Corner\Models\Item;
use App\MiniApps\History\Models\Event;
use App\MiniApps\Mailbox\Models\Bouquet;
use App\MiniApps\Mailbox\Models\Citation;
use App\MiniApps\Mailbox\Models\Coupon;
use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\Shell\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class DashboardFeedTest extends TestCase
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

    /** @return list<array<string, mixed>> */
    private function feedFor(User $user): array
    {
        $feed = null;
        $this->actingAs($user)->get('/dashboard')
            ->assertOk()
            ->assertInertia(function ($page) use (&$feed) {
                $feed = $page->toArray()['props']['feed'];
            });

        return $feed;
    }

    public function test_mail_waiting_on_someone_reaches_only_them(): void
    {
        $ravi = User::factory()->create(['name' => 'Ravi']);
        $meera = User::factory()->create(['name' => 'Meera']);
        $kabir = User::factory()->create(['name' => 'Kabir']);

        MailboxMessage::factory()->to($meera)->create(['sender_id' => $ravi->id]);
        Bouquet::factory()->to($meera)->create(['sender_id' => $ravi->id]);
        Citation::factory()->create(['issuer_id' => $ravi->id, 'recipient_id' => $meera->id, 'offence' => 'Wet towels on the bed']);
        Coupon::factory()->requested()->create(['issuer_id' => $ravi->id, 'recipient_id' => $meera->id, 'title' => 'Movie night']);

        $meeraTitles = array_column($this->feedFor($meera), 'title');
        $this->assertContains('A note from Ravi', $meeraTitles);
        $this->assertContains('Flowers from Ravi', $meeraTitles);
        $this->assertContains('Citation from Ravi', $meeraTitles);
        $this->assertNotContains('Meera wants to use a coupon', $meeraTitles);

        $this->assertContains('Meera wants to use a coupon', array_column($this->feedFor($ravi), 'title'));

        $this->assertSame([], $this->feedFor($kabir));
    }

    public function test_a_note_says_who_but_never_what(): void
    {
        $ravi = User::factory()->create(['name' => 'Ravi']);
        $meera = User::factory()->create();
        MailboxMessage::factory()->to($meera)->create(['sender_id' => $ravi->id, 'body' => 'The cake is behind the rice tin']);

        $this->assertStringNotContainsString('cake', json_encode($this->feedFor($meera)));
    }

    public function test_new_lists_others_additions_from_this_week_only(): void
    {
        $asha = User::factory()->create(['name' => 'Asha']);
        $meera = User::factory()->create();
        $list = CornerList::factory()->create(['name' => 'Films']);

        Item::factory()->create(['list_id' => $list->id, 'added_by_user_id' => $asha->id, 'title' => 'This week', 'added_at' => '2026-10-21 10:00:00']);
        Item::factory()->create(['list_id' => $list->id, 'added_by_user_id' => $asha->id, 'title' => 'Last month', 'added_at' => '2026-09-21 10:00:00']);
        Item::factory()->create(['list_id' => $list->id, 'added_by_user_id' => $meera->id, 'title' => 'Mine', 'added_at' => '2026-10-21 10:00:00']);
        Event::factory()->create(['creator_id' => $asha->id, 'title' => 'Picnic']);

        $feed = $this->feedFor($meera);

        $this->assertSame(['Picnic', 'This week'], array_column($feed, 'detail'));
        $this->assertSame(['new', 'new'], array_column($feed, 'kind'));
    }

    public function test_a_room_that_is_off_adds_nothing(): void
    {
        $ravi = User::factory()->create();
        $meera = User::factory()->create();
        Citation::factory()->create(['issuer_id' => $ravi->id, 'recipient_id' => $meera->id]);

        $this->setRoom('our-exchange', false);

        $this->assertSame([], $this->feedFor($meera));
    }

    public function test_birthdays_in_the_next_two_weeks_are_coming_up(): void
    {
        $kabir = User::factory()->create(['name' => 'Kabir', 'birthday' => '2014-10-27']);
        User::factory()->create(['birthday' => '1990-12-01']);

        $this->actingAs($kabir)->get('/dashboard')
            ->assertInertia(fn ($p) => $p
                ->where('today', '2026-10-22')
                ->has('birthdays', 1)
                ->where('birthdays.0.on', '2026-10-27')
                ->where('birthdays.0.turns', 12));
    }

    public function test_the_two_weeks_are_counted_in_the_household_timezone(): void
    {
        config(['shell.timezone' => 'Asia/Kolkata']);
        $asha = User::factory()->create(['name' => 'Asha Rao', 'birthday' => '1990-11-05']);
        User::factory()->create(['birthday' => '1990-11-06']);

        $this->actingAs($asha)->get('/dashboard')
            ->assertInertia(fn ($p) => $p
                ->has('birthdays', 1)
                ->where('birthdays.0.on', '2026-11-05')
                ->where('birthdays.0.person.name', 'Asha'));
    }

    public function test_home_says_first_names_unless_two_members_share_one(): void
    {
        $ravi = User::factory()->create(['name' => 'Ravi Rao']);
        $meera = User::factory()->create(['name' => 'Meera Rao']);
        Citation::factory()->create(['issuer_id' => $ravi->id, 'recipient_id' => $meera->id]);

        $this->assertContains('Citation from Ravi', array_column($this->feedFor($meera), 'title'));

        User::factory()->create(['name' => 'Ravi Shah']);
        // A real request gets a fresh Household; the test reuses one application.
        $this->app->forgetScopedInstances();

        $this->assertContains('Citation from Ravi Rao', array_column($this->feedFor($meera), 'title'));
    }

    public function test_a_bouquet_slip_names_its_flowers_but_not_its_note(): void
    {
        $ravi = User::factory()->create();
        $meera = User::factory()->create();
        Bouquet::factory()->to($meera)->create([
            'sender_id' => $ravi->id,
            'note' => 'Happy anniversary',
            'flowers' => [['key' => 'tulip', 'name' => 'Tulip', 'meaning' => 'Love']],
        ]);

        $feed = $this->feedFor($meera);

        $this->assertSame('Tulip', $feed[0]['detail']);
        $this->assertStringNotContainsString('anniversary', json_encode($feed));
    }
}
