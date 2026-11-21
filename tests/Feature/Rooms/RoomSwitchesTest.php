<?php

namespace Tests\Feature\Rooms;

use App\MiniApps\History\Models\Event;
use App\Shell\Models\User;
use App\Shell\Notifications\GenericPushNotification;
use App\Shell\Services\Rooms;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class RoomSwitchesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    private function admin(): User
    {
        return User::factory()->admin()->create();
    }

    private function rooms(): Rooms
    {
        return app(Rooms::class);
    }

    public function test_a_room_that_is_off_has_no_routes_or_place_on_home(): void
    {
        $user = User::factory()->create();
        Event::factory()->create(['creator_id' => $user->id, 'occurred_on' => now()->subYear()->toDateString()]);
        $this->setRoom('our-history', false);

        $this->actingAs($user)->get('/apps/our-history')->assertNotFound();
        $this->get('/apps/our-history/timeline')->assertNotFound();

        $this->get('/dashboard')->assertOk()->assertInertia(fn ($page) => $page
            ->where('miniApps', fn ($apps) => collect($apps)->pluck('slug')->doesntContain('our-history')
                && collect($apps)->pluck('slug')->contains('our-shelf'))
        );

        $this->get('/apps/our-shelf')->assertOk();
    }

    public function test_turning_a_room_off_and_on_again_keeps_its_data(): void
    {
        $user = User::factory()->create();
        $event = Event::factory()->create(['creator_id' => $user->id]);

        $this->setRoom('our-history', false);
        $this->assertDatabaseHas('our_history_events', ['id' => $event->id]);

        $this->setRoom('our-history', true);

        $this->actingAs($user)->get('/apps/our-history')->assertOk();
        $this->assertDatabaseHas('our_history_events', ['id' => $event->id]);
    }

    public function test_a_guest_is_sent_to_login_not_shown_a_404_for_a_room_that_is_off(): void
    {
        $this->setRoom('our-history', false);

        $this->get('/apps/our-history')->assertRedirect(route('login'));
    }

    public function test_a_room_that_is_off_sends_no_push(): void
    {
        Notification::fake();
        $this->setRoom('our-exchange', false);
        $sender = User::factory()->create();
        $recipient = User::factory()->create();

        app(\App\Shell\Services\PushDispatcher::class)
            ->toUsers([$recipient], 'our-exchange', 'our-exchange:citations', 'body', '/apps/our-exchange');

        Notification::assertNothingSent();

        $this->actingAs($sender)->post('/apps/our-exchange/citations', [
            'recipient_ids' => [$recipient->id],
            'offence' => 'x',
            'penalty' => 'y',
        ])->assertNotFound();

        Notification::assertNothingSent();
    }

    private function makeAdminOnly(string $slug): void
    {
        $index = collect(config('miniapps'))->search(fn (array $app): bool => $app['slug'] === $slug);
        config(["miniapps.{$index}.admin_only" => true]);
    }

    public function test_an_admin_only_room_is_entered_seen_and_pushed_to_by_admins_alone(): void
    {
        Notification::fake();
        $this->makeAdminOnly('our-history');
        $admin = $this->admin();
        $user = User::factory()->create();

        $this->assertTrue($this->rooms()->canEnter($admin, 'our-history'));
        $this->assertFalse($this->rooms()->canEnter($user, 'our-history'));
        $this->assertFalse($this->rooms()->canEnter(null, 'our-history'));
        $this->assertTrue($this->rooms()->canEnter($user, 'our-shelf'));

        $this->actingAs($user)->get('/apps/our-history')->assertNotFound();
        $this->get('/dashboard')->assertOk()->assertInertia(fn ($page) => $page
            ->where('miniApps', fn ($apps) => collect($apps)->pluck('slug')->doesntContain('our-history'))
        );

        $this->actingAs($admin)->get('/apps/our-history')->assertOk();
        $this->get('/dashboard')->assertOk()->assertInertia(fn ($page) => $page
            ->where('miniApps', fn ($apps) => collect($apps)->pluck('slug')->contains('our-history'))
        );

        $urls = collect($this->get('/manifest.webmanifest')->json('shortcuts'))->pluck('url');
        $this->assertNotContains('/apps/our-history', $urls->all());

        // Recipients from a query, as Household gives them: the role check must not lazy-load.
        $recipients = User::query()->whereKey([$admin->id, $user->id])->get();
        app(\App\Shell\Services\PushDispatcher::class)
            ->toUsers($recipients, 'our-history', 'our-history', 'body', '/apps/our-history');

        Notification::assertSentTo($admin, GenericPushNotification::class);
        Notification::assertNotSentTo($user, GenericPushNotification::class);
    }

    public function test_an_admin_only_room_that_is_off_is_closed_to_admins_too(): void
    {
        $this->makeAdminOnly('our-history');
        $this->setRoom('our-history', false);
        $admin = $this->admin();

        $this->assertFalse($this->rooms()->canEnter($admin, 'our-history'));
        $this->actingAs($admin)->get('/apps/our-history')->assertNotFound();
    }

    public function test_an_off_room_stays_out_of_the_manifest_shortcuts(): void
    {
        $this->setRoom('our-history', false);

        $urls = collect($this->get('/manifest.webmanifest')->json('shortcuts'))->pluck('url');

        $this->assertNotContains('/apps/our-history', $urls->all());
        $this->assertContains('/apps/our-shelf', $urls->all());
    }

    public function test_a_fresh_install_starts_with_no_rooms_and_home_says_so(): void
    {
        DB::table('room_settings')->delete();
        app()->forgetScopedInstances();

        $this->actingAs(User::factory()->create())->get('/dashboard')->assertOk()
            ->assertInertia(fn ($page) => $page->where('miniApps', []));

        $this->actingAs($this->admin())->get('/dashboard')->assertOk()
            ->assertInertia(fn ($page) => $page->where('miniApps', []));
    }

    public function test_unknown_rooms_are_never_on(): void
    {
        $this->assertFalse($this->rooms()->isOn('nonexistent'));
    }

    public function test_the_migration_turns_everything_on_for_an_install_that_has_people(): void
    {
        Schema::drop('room_settings');
        User::factory()->create();

        (require base_path('database/migrations/shell/2026_11_16_000100_create_room_settings_table.php'))->up();

        $this->assertEqualsCanonicalizing(
            collect(config('miniapps'))->pluck('slug')->all(),
            DB::table('room_settings')->where('enabled', true)->pluck('key')->all(),
        );
    }

    public function test_the_migration_leaves_a_fresh_install_empty(): void
    {
        Schema::drop('room_settings');
        DB::table('users')->delete();

        (require base_path('database/migrations/shell/2026_11_16_000100_create_room_settings_table.php'))->up();

        $this->assertSame(0, DB::table('room_settings')->count());
    }
}
