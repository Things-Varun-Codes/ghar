<?php

namespace Tests\Feature\Corner;

use App\Shell\Models\User;
use App\Shell\Notifications\GenericPushNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class CornerPushTagTest extends TestCase
{
    use RefreshDatabase;

    public function test_songs_push_uses_correct_tag(): void
    {
        Notification::fake();
        Http::fake([
            'youtube.com/oembed*' => Http::response([
                'title' => 'Tag Contract Track',
                'author_name' => 'Tag Contract Artist',
                'thumbnail_url' => 'https://i.ytimg.com/vi/tagContract/hqdefault.jpg',
            ], 200),
        ]);

        $adder = User::factory()->create();
        $recipient = User::factory()->create();

        $this->actingAs($adder)
            ->post('/apps/our-corner/songs', [
                'url' => 'https://www.youtube.com/watch?v=tagContract',
            ])
            ->assertRedirect();

        Notification::assertSentTo(
            $recipient,
            GenericPushNotification::class,
            function (GenericPushNotification $notification) use ($recipient) {
                $webPushMessage = $notification->toWebPush($recipient, $notification);
                $array = $webPushMessage->toArray();

                return ($array['tag'] ?? null) === 'our-corner:songs';
            }
        );
    }

    public function test_movies_push_uses_correct_tag(): void
    {
        Notification::fake();

        $adder = User::factory()->create();
        $recipient = User::factory()->create();

        $this->actingAs($adder)
            ->post('/apps/our-corner/movies', ['title' => 'Tag Contract Movie'])
            ->assertRedirect();

        Notification::assertSentTo(
            $recipient,
            GenericPushNotification::class,
            function (GenericPushNotification $notification) use ($recipient) {
                $webPushMessage = $notification->toWebPush($recipient, $notification);
                $array = $webPushMessage->toArray();

                return ($array['tag'] ?? null) === 'our-corner:movies';
            }
        );
    }

    public function test_activities_push_uses_correct_tag(): void
    {
        Notification::fake();

        $adder = User::factory()->create();
        $recipient = User::factory()->create();

        $this->actingAs($adder)
            ->post('/apps/our-corner/activities', ['title' => 'Tag Contract Activity'])
            ->assertRedirect();

        Notification::assertSentTo(
            $recipient,
            GenericPushNotification::class,
            function (GenericPushNotification $notification) use ($recipient) {
                $webPushMessage = $notification->toWebPush($recipient, $notification);
                $array = $webPushMessage->toArray();

                return ($array['tag'] ?? null) === 'our-corner:activities';
            }
        );
    }

    public function test_places_push_uses_correct_tag(): void
    {
        Notification::fake();

        $adder = User::factory()->create();
        $recipient = User::factory()->create();

        $this->actingAs($adder)
            ->post('/apps/our-corner/places', [
                'title' => 'Tag Contract Place',
                'place_id' => 'ChIJtagContract',
                'lat' => 1.234,
                'lng' => 5.678,
                'address' => 'Tag Contract Address',
            ])
            ->assertRedirect();

        Notification::assertSentTo(
            $recipient,
            GenericPushNotification::class,
            function (GenericPushNotification $notification) use ($recipient) {
                $webPushMessage = $notification->toWebPush($recipient, $notification);
                $array = $webPushMessage->toArray();

                return ($array['tag'] ?? null) === 'our-corner:places';
            }
        );
    }

    public function test_mute_flag(): void
    {
        Notification::fake();

        $adder = User::factory()->create();
        User::factory()->create();

        Config::set('corner-lists.activities.push_on_add', false);

        $this->actingAs($adder)
            ->post('/apps/our-corner/activities', ['title' => 'Muted Activity'])
            ->assertRedirect();

        $this->assertDatabaseHas('corner_activities', ['title' => 'Muted Activity']);
        Notification::assertNothingSent();
    }
}
