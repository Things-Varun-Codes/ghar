<?php

namespace Tests\Unit\Shell\Services;

use App\Shell\Models\User;
use App\Shell\Notifications\GenericPushNotification;
use App\Shell\Services\Household;
use App\Shell\Services\PushDispatcher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PushDispatcherTest extends TestCase
{
    use RefreshDatabase;

    public function test_to_household_reaches_every_other_member_with_the_payload(): void
    {
        Notification::fake();

        $actor = User::factory()->create(['name' => 'Alice Smith']);
        $first = User::factory()->create();
        $second = User::factory()->create();

        app(PushDispatcher::class)->toHousehold(
            $actor,
            'our-shelf',
            'our-shelf:songs',
            'Alice added a song',
            '/apps/our-shelf/songs',
        );

        foreach ([$first, $second] as $member) {
            Notification::assertSentTo(
                $member,
                GenericPushNotification::class,
                function (GenericPushNotification $notification) use ($member) {
                    $array = $notification->toWebPush($member, $notification)->toArray();

                    return ($array['tag'] ?? null) === 'our-shelf:songs'
                        && ($array['body'] ?? null) === 'Alice added a song'
                        && ($array['data']['url'] ?? null) === '/apps/our-shelf/songs';
                }
            );
        }

        Notification::assertNotSentTo($actor, GenericPushNotification::class);
    }

    public function test_to_household_sends_nothing_when_the_actor_lives_alone(): void
    {
        Notification::fake();

        $actor = User::factory()->create();

        app(PushDispatcher::class)->toHousehold($actor, 'our-shelf', 'our-shelf:songs', 'body', '/apps/our-shelf');

        Notification::assertNothingSent();
    }

    public function test_to_users_reaches_only_the_given_recipients(): void
    {
        Notification::fake();

        $recipient = User::factory()->create();
        $bystander = User::factory()->create();

        app(PushDispatcher::class)->toUsers(
            [$recipient],
            'our-exchange',
            'our-exchange:messages',
            'You got a note from Alice',
            '/apps/our-exchange/messages?focus=1',
        );

        Notification::assertSentTo($recipient, GenericPushNotification::class);
        Notification::assertNotSentTo($bystander, GenericPushNotification::class);
    }

    public function test_household_options_list_everyone_else_by_name(): void
    {
        $me = User::factory()->create(['name' => 'Zara']);
        $b = User::factory()->create(['name' => 'Bea']);
        $a = User::factory()->create(['name' => 'Arjun']);

        $this->assertSame(
            [
                ['id' => $a->id, 'name' => 'Arjun', 'avatar_url' => null],
                ['id' => $b->id, 'name' => 'Bea', 'avatar_url' => null],
            ],
            app(Household::class)->optionsFor($me),
        );
        $this->assertCount(3, app(Household::class)->members());
    }

    public function test_first_name_returns_leading_token(): void
    {
        $user = User::factory()->make(['name' => 'Alex Doe']);

        $this->assertSame('Alex', $user->firstName());
    }

    public function test_first_name_of_empty_name_returns_empty_string(): void
    {
        $user = User::factory()->make(['name' => '']);

        $this->assertSame('', $user->firstName());
    }
}
