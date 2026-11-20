<?php

namespace Tests\Feature\Notifications;

use App\MiniApps\History\Models\DigestClaim;
use App\MiniApps\History\Models\Event;
use App\Shell\Models\User;
use App\Shell\Notifications\GenericPushNotification;
use App\Shell\Services\Rooms;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class MorningMemoriesDigestTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['shell.timezone' => 'UTC']);
        Carbon::setTestNow('2026-06-14 09:00:00');
        Notification::fake();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_one_memory_links_to_it_and_every_member_with_the_switch_on_gets_one_push(): void
    {
        $asha = User::factory()->create(['name' => 'Asha Rao']);
        $ravi = User::factory()->create(['name' => 'Ravi Rao']);
        $kabir = User::factory()->create(['name' => 'Kabir Rao', 'morning_memories' => false]);
        $memory = Event::factory()->create(['occurred_on' => '2025-06-14', 'title' => 'Chai on the new balcony']);

        $this->artisan('history:morning-memories')->assertSuccessful();

        foreach ([$asha, $ravi] as $member) {
            Notification::assertSentToTimes($member, GenericPushNotification::class, 1);
            $push = $this->pushTo($member);
            $this->assertSame('On this day in 2025: Chai on the new balcony', $push['body']);
            $this->assertSame("/apps/our-history?moment={$memory->id}", $push['data']['url']);
            $this->assertSame('our-history:on-this-day', $push['tag']);
        }
        Notification::assertNotSentTo($kabir, GenericPushNotification::class);
    }

    public function test_many_memories_link_to_the_timeline(): void
    {
        $member = User::factory()->create();
        Event::factory()->create(['occurred_on' => '2025-06-14']);
        Event::factory()->create(['occurred_on' => '2019-06-14']);

        $this->artisan('history:morning-memories')->assertSuccessful();

        $push = $this->pushTo($member);
        $this->assertSame('2 memories from this day.', $push['body']);
        $this->assertSame('/apps/our-history', $push['data']['url']);
    }

    public function test_birthdays_greet_the_birthday_person_and_tell_everyone_else(): void
    {
        $meera = User::factory()->create(['name' => 'Meera Rao', 'birthday' => '1992-06-14']);
        $ravi = User::factory()->create(['name' => 'Ravi Rao', 'birthday' => '1990-07-02']);

        $this->artisan('history:morning-memories')->assertSuccessful();

        $this->assertSame('Happy birthday, Meera! 34 today.', $this->pushTo($meera)['body']);
        $this->assertSame("It's Meera's birthday: 34 today.", $this->pushTo($ravi)['body']);
        $this->assertSame('/apps/our-history', $this->pushTo($ravi)['data']['url']);
    }

    public function test_a_birthday_linked_memory_reads_as_that_birthday(): void
    {
        $meera = User::factory()->create(['name' => 'Meera Rao', 'birthday' => '1992-06-14']);
        $ravi = User::factory()->create(['name' => 'Ravi Rao']);
        Event::factory()->birthdayOf($meera)->create(['occurred_on' => '2022-06-14', 'title' => 'Picnic in Cubbon Park']);

        $this->artisan('history:morning-memories')->assertSuccessful();

        $this->assertSame(
            "It's Meera's birthday: 34 today. Meera's birthday, 2022: Picnic in Cubbon Park",
            $this->pushTo($ravi)['body'],
        );

        Event::factory()->create(['occurred_on' => '2025-06-14']);
        DigestClaim::query()->delete();
        Notification::fake();

        $this->artisan('history:morning-memories')->assertSuccessful();

        $this->assertSame(
            "Happy birthday, Meera! 34 today. 2 memories from this day, among them Meera's birthday, 2022.",
            $this->pushTo($meera)['body'],
        );
    }

    public function test_untitled_memories_still_read(): void
    {
        $member = User::factory()->create();
        $meera = User::factory()->create(['name' => 'Meera Rao', 'birthday' => '1992-01-01']);
        $memory = Event::factory()->create(['occurred_on' => '2023-06-14', 'title' => null]);

        $this->artisan('history:morning-memories')->assertSuccessful();
        $this->assertSame('A memory from this day in 2023.', $this->pushTo($member)['body']);

        $memory->update(['birthday_user_id' => $meera->id, 'title' => '  ']);
        DigestClaim::query()->delete();
        Notification::fake();

        $this->artisan('history:morning-memories')->assertSuccessful();
        $this->assertSame("A memory from Meera's birthday, 2023.", $this->pushTo($member)['body']);
    }

    public function test_a_second_run_the_same_day_sends_nothing_and_the_next_day_sends_again(): void
    {
        $member = User::factory()->create();
        Event::factory()->create(['occurred_on' => '2025-06-14']);
        Event::factory()->create(['occurred_on' => '2025-06-15']);

        $this->artisan('history:morning-memories')->assertSuccessful();
        Carbon::setTestNow('2026-06-14 10:00:00');
        $this->artisan('history:morning-memories')->assertSuccessful();

        Notification::assertSentToTimes($member, GenericPushNotification::class, 1);
        $this->assertSame(['2026-06-14'], DigestClaim::query()->pluck('day')->map->toDateString()->all());

        Carbon::setTestNow('2026-06-15 09:00:00');
        $this->artisan('history:morning-memories')->assertSuccessful();

        Notification::assertSentToTimes($member, GenericPushNotification::class, 2);
    }

    public function test_the_claim_is_on_the_households_day(): void
    {
        // 04:00 UTC on the 14th is 09:30 in Kolkata: a moment from the 14th is today's.
        config(['shell.timezone' => 'Asia/Kolkata']);
        Carbon::setTestNow('2026-06-14 04:00:00');
        $member = User::factory()->create();
        Event::factory()->create(['occurred_on' => '2025-06-14']);

        $this->artisan('history:morning-memories')->assertSuccessful();

        Notification::assertSentToTimes($member, GenericPushNotification::class, 1);
        $this->assertSame('2026-06-14', DigestClaim::query()->sole()->day->toDateString());
    }

    public function test_the_room_off_sends_nothing_and_leaves_the_day_unclaimed(): void
    {
        $member = User::factory()->create();
        Event::factory()->create(['occurred_on' => '2025-06-14']);
        app(Rooms::class)->set('our-history', false);

        $this->artisan('history:morning-memories')->assertSuccessful();

        Notification::assertNothingSent();
        $this->assertSame(0, DigestClaim::query()->count());

        app(Rooms::class)->set('our-history', true);
        Carbon::setTestNow('2026-06-14 11:00:00');
        $this->artisan('history:morning-memories')->assertSuccessful();

        Notification::assertSentToTimes($member, GenericPushNotification::class, 1);
    }

    public function test_nothing_to_say_sends_nothing_and_claims_nothing(): void
    {
        User::factory()->create(['birthday' => '1992-06-15']);
        Event::factory()->create(['occurred_on' => '2025-06-13']);
        Event::factory()->create(['occurred_on' => '2026-06-14']);

        $this->artisan('history:morning-memories')->assertSuccessful();

        Notification::assertNothingSent();
        $this->assertSame(0, DigestClaim::query()->count());
    }

    public function test_a_leap_day_birthday_is_kept_on_feb_28(): void
    {
        Carbon::setTestNow('2027-02-28 09:00:00');
        $leapling = User::factory()->create(['name' => 'Tara Rao', 'birthday' => '2000-02-29']);

        $this->artisan('history:morning-memories')->assertSuccessful();

        $this->assertSame('Happy birthday, Tara! 27 today.', $this->pushTo($leapling)['body']);
    }

    /** @return array<string, mixed> */
    private function pushTo(User $user): array
    {
        $sent = Notification::sent($user, GenericPushNotification::class);
        $this->assertCount(1, $sent, "{$user->name} should get one push");

        return $sent->first()->toWebPush($user, $sent->first())->toArray();
    }
}
