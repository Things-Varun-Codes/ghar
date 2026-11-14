<?php

namespace Tests\Feature\Corner;

use App\MiniApps\Corner\Models\Song;
use App\Shell\Models\User;
use App\Shell\Notifications\GenericPushNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class CornerSongsTest extends TestCase
{
    use RefreshDatabase;

    private function fakeYouTube(): void
    {
        Http::fake([
            'youtube.com/oembed*' => Http::response([
                'title' => 'Test Track',
                'author_name' => 'Test Artist',
                'thumbnail_url' => 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
            ], 200),
        ]);
    }

    private function fakeSpotify(): void
    {
        Http::fake([
            'open.spotify.com/oembed*' => Http::response([
                'title' => 'Spotify Track - song by Spotify Artist',
                'thumbnail_url' => 'https://i.scdn.co/image/abc',
            ], 200),
        ]);
    }

    public function test_add_youtube(): void
    {
        Notification::fake();
        $this->fakeYouTube();

        $adder = User::factory()->create(['name' => 'Alice Smith']);
        $recipient = User::factory()->create(['name' => 'Bob Jones']);

        $this->actingAs($adder)
            ->post('/apps/our-corner/songs', [
                'url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            ])
            ->assertRedirect('/apps/our-corner/songs');

        $this->assertDatabaseHas('corner_songs', [
            'provider' => 'youtube',
            'provider_id' => 'dQw4w9WgXcQ',
            'title' => 'Test Track',
            'author' => 'Test Artist',
            'added_by_user_id' => $adder->id,
        ]);

        Notification::assertSentTo(
            $recipient,
            GenericPushNotification::class,
            function (GenericPushNotification $n) use ($recipient) {
                $webPush = $n->toWebPush($recipient, $n)->toArray();

                return ($webPush['tag'] ?? null) === 'our-corner:songs'
                    && str_contains($webPush['body'] ?? '', 'added a song');
            }
        );
    }

    public function test_add_spotify(): void
    {
        Notification::fake();
        $this->fakeSpotify();

        $adder = User::factory()->create();
        User::factory()->create(); // recipient

        $this->actingAs($adder)
            ->post('/apps/our-corner/songs', [
                'url' => 'https://open.spotify.com/track/3z8h0TU7ReDPLIbEnYhWZb',
            ])
            ->assertRedirect('/apps/our-corner/songs');

        $this->assertDatabaseHas('corner_songs', [
            'provider' => 'spotify',
            'provider_id' => '3z8h0TU7ReDPLIbEnYhWZb',
            'author' => null, // Spotify oEmbed returns no author.
        ]);

        Http::assertSent(function ($req) {
            return str_starts_with($req->url(), 'https://open.spotify.com/oembed?');
        });
    }

    public function test_oembed_timeout_fallback(): void
    {
        Notification::fake();

        Http::fake(function () {
            throw new ConnectionException('Timeout');
        });

        $adder = User::factory()->create();
        User::factory()->create();

        $url = 'https://www.youtube.com/watch?v=timeoutVid1';

        $this->actingAs($adder)
            ->post('/apps/our-corner/songs', ['url' => $url])
            ->assertRedirect('/apps/our-corner/songs');

        // Fallback persists with title = url, provider = 'unknown'.
        $this->assertDatabaseHas('corner_songs', [
            'title' => $url,
            'url' => $url,
            'provider' => 'unknown',
            'added_by_user_id' => $adder->id,
        ]);
    }

    public function test_duplicate_constraint(): void
    {
        Notification::fake();
        $this->fakeYouTube();

        $adder = User::factory()->create();
        User::factory()->create();
        $url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

        $this->actingAs($adder)->post('/apps/our-corner/songs', ['url' => $url]);
        $this->assertSame(1, Song::count());
        Notification::assertSentTimes(GenericPushNotification::class, 1);

        // The second POST finds the row: a field error, and no second push.
        $this->actingAs($adder)
            ->post('/apps/our-corner/songs', ['url' => $url])
            ->assertSessionHasErrors(['url' => 'That song is already in your list.']);

        $this->assertSame(1, Song::count());
        Notification::assertSentTimes(GenericPushNotification::class, 1);
    }

    public function test_invalid_url_returns_validation_error(): void
    {
        $adder = User::factory()->create();
        User::factory()->create();

        // A non-URL value triggers the FormRequest validator.
        $response = $this->actingAs($adder)
            ->from('/apps/our-corner/songs')
            ->post('/apps/our-corner/songs', ['url' => 'not-a-url']);

        $response->assertSessionHasErrors([
            'url' => "That doesn't look like a YouTube or Spotify link.",
        ]);
    }

    public function test_oembed_preview_endpoint(): void
    {
        $this->fakeYouTube();
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson(
            '/api/corner/oembed-preview?url='.urlencode('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
        );

        $response->assertOk()
            ->assertJson([
                'ok' => true,
                'provider' => 'youtube',
                'provider_id' => 'dQw4w9WgXcQ',
                'title' => 'Test Track',
            ]);
    }

    public function test_oembed_preview_endpoint_returns_ok_false_for_invalid_url(): void
    {
        Http::fake();
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson(
            '/api/corner/oembed-preview?url='.urlencode('https://example.com/not-music')
        );

        $response->assertOk()->assertJson(['ok' => false]);
    }

    public function test_owner_can_update_song_and_re_derives_metadata(): void
    {
        Notification::fake();
        $this->fakeYouTube();

        $adder = User::factory()->create();
        User::factory()->create();
        $song = Song::factory()->create([
            'added_by_user_id' => $adder->id,
            'provider' => 'youtube',
            'provider_id' => 'oldVideoId1',
            'title' => 'Old Title',
            'author' => 'Old Artist',
        ]);

        $this->actingAs($adder)
            ->patch("/apps/our-corner/songs/{$song->id}", [
                'url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('corner_songs', [
            'id' => $song->id,
            'provider' => 'youtube',
            // provider_id re-derived from the URL; title/author from oEmbed.
            'provider_id' => 'dQw4w9WgXcQ',
            'title' => 'Test Track',
            'author' => 'Test Artist',
            'url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        ]);

        // Edit is silent — no push on update.
        Notification::assertNothingSent();
    }

    public function test_update_song_requires_url(): void
    {
        $adder = User::factory()->create();
        $song = Song::factory()->create(['added_by_user_id' => $adder->id]);

        $this->actingAs($adder)
            ->from('/apps/our-corner/songs')
            ->patch("/apps/our-corner/songs/{$song->id}", ['url' => ''])
            ->assertSessionHasErrors(['url']);
    }

    public function test_song_update_link_collision_is_graceful(): void
    {
        $this->fakeYouTube();

        $adder = User::factory()->create();
        User::factory()->create();

        // Song A already holds the target provider_id (extracted from the URL,  not the oEmbed
        // body).
        Song::factory()->create([
            'added_by_user_id' => $adder->id,
            'provider' => 'youtube',
            'provider_id' => 'dQw4w9WgXcQ',
        ]);
        // Song B — edited to collide with A.
        $songB = Song::factory()->create([
            'added_by_user_id' => $adder->id,
            'provider' => 'youtube',
            'provider_id' => 'bbbbbbbbbbb',
        ]);

        $this->actingAs($adder)
            ->from('/apps/our-corner/songs')
            ->patch("/apps/our-corner/songs/{$songB->id}", [
                'url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            ])
            ->assertSessionHasErrors(['url']);

        // Row unchanged — transaction rolled back.
        $songB->refresh();
        $this->assertSame('bbbbbbbbbbb', $songB->provider_id);
    }
}
