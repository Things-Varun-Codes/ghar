<?php

namespace Tests\Feature\Corner;

use App\MiniApps\Corner\Models\Movie;
use App\Shell\Models\User;
use App\Shell\Notifications\GenericPushNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class CornerMoviesTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_add_movie(): void
    {
        Notification::fake();

        $adder = User::factory()->create(['name' => 'Alice Smith']);
        $recipient = User::factory()->create(['name' => 'Bob Jones']);

        $this->actingAs($adder)
            ->post('/apps/our-corner/movies', ['title' => 'Inception'])
            ->assertRedirect('/apps/our-corner/movies');

        $this->assertDatabaseHas('corner_movies', [
            'title' => 'Inception',
            'added_by_user_id' => $adder->id,
        ]);

        Notification::assertSentTo(
            $recipient,
            GenericPushNotification::class,
            function (GenericPushNotification $n) use ($recipient) {
                $webPush = $n->toWebPush($recipient, $n)->toArray();

                return ($webPush['tag'] ?? null) === 'our-corner:movies'
                    && str_contains($webPush['body'] ?? '', 'added a movie: Inception');
            }
        );
    }

    public function test_client_sent_poster_url_is_ignored(): void
    {
        // The poster is server-derived  from the Plex link only; a client-sent poster_url is
        // ignored. With no  plex_url the resolver short-circuits to null and makes NO HTTP
        // call.
        Notification::fake();
        Http::fake();

        $adder = User::factory()->create();
        User::factory()->create();

        $this->actingAs($adder)
            ->post('/apps/our-corner/movies', [
                'title' => 'Interstellar',
                'poster_url' => 'https://example.com/poster.jpg',
            ])
            ->assertRedirect('/apps/our-corner/movies');

        $this->assertDatabaseHas('corner_movies', [
            'title' => 'Interstellar',
            'poster_url' => null,
        ]);

        // No plex_url → resolver returns null with no fetch.
        Http::assertNothingSent();
    }

    public function test_title_required(): void
    {
        Notification::fake();

        $adder = User::factory()->create();
        User::factory()->create();

        $this->actingAs($adder)
            ->from('/apps/our-corner/movies')
            ->post('/apps/our-corner/movies', [])
            ->assertSessionHasErrors(['title']);

        $this->assertSame(0, Movie::count());
    }

    public function test_done_toggle(): void
    {
        $adder = User::factory()->create();
        $other = User::factory()->create();
        $movie = Movie::factory()->create([
            'added_by_user_id' => $adder->id,
            'done_at' => null,
            'done_by_user_id' => null,
        ]);

        // Toggle ON.
        $this->actingAs($adder)
            ->patch("/apps/our-corner/movies/{$movie->id}/toggle-done")
            ->assertRedirect();

        $movie->refresh();
        $this->assertNotNull($movie->done_at);
        $this->assertSame($adder->id, $movie->done_by_user_id);

        // Toggle OFF (symmetric).
        $this->actingAs($other)
            ->patch("/apps/our-corner/movies/{$movie->id}/toggle-done")
            ->assertRedirect();

        $movie->refresh();
        $this->assertNull($movie->done_at);
        $this->assertNull($movie->done_by_user_id);
    }

    public function test_owner_only_can_delete(): void
    {
        $adder = User::factory()->create();
        $other = User::factory()->create();
        $movie = Movie::factory()->create(['added_by_user_id' => $adder->id]);

        $this->actingAs($other)
            ->delete("/apps/our-corner/movies/{$movie->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('corner_movies', ['id' => $movie->id]);

        // Owner succeeds.
        $this->actingAs($adder)
            ->delete("/apps/our-corner/movies/{$movie->id}")
            ->assertRedirect();

        $this->assertDatabaseMissing('corner_movies', ['id' => $movie->id]);
    }

    public function test_either_user_can_mark_watched_together(): void
    {
        $adder = User::factory()->create();
        $other = User::factory()->create();
        $movie = Movie::factory()->create([
            'added_by_user_id' => $adder->id,
            'done_at' => null,
            'done_by_user_id' => null,
        ]);

        // Non-adder toggles "watched together" — symmetric.
        $this->actingAs($other)
            ->patch("/apps/our-corner/movies/{$movie->id}/toggle-done")
            ->assertRedirect();

        $movie->refresh();
        $this->assertSame($other->id, $movie->done_by_user_id);
    }

    public function test_movie_persists_plex_url(): void
    {
        Notification::fake();

        Http::fake([
            'watch.plex.tv/*' => Http::response(
                '<html><head>'
                .'<meta property="og:title" content="The Man from Earth">'
                .'<meta property="og:image" content="https://images.plex.tv/photo?url=server-derived">'
                .'</head></html>',
                200,
            ),
        ]);

        $adder = User::factory()->create();
        User::factory()->create();

        $this->actingAs($adder)
            ->post('/apps/our-corner/movies', [
                'title' => 'The Man from Earth',
                // A client-sent poster_url — must be IGNORED (server derives it).
                'poster_url' => 'https://images.plex.tv/photo?url=client-sent',
                'plex_url' => 'https://watch.plex.tv/movie/x',
            ])
            ->assertRedirect('/apps/our-corner/movies');

        $this->assertDatabaseHas('corner_movies', [
            'title' => 'The Man from Earth',
            'plex_url' => 'https://watch.plex.tv/movie/x',
            // SERVER-derived from the faked og:image — NOT the client value.
            'poster_url' => 'https://images.plex.tv/photo?url=server-derived',
        ]);
    }

    public function test_owner_can_update_movie_and_re_derives_poster(): void
    {
        Notification::fake();
        Http::fake([
            'watch.plex.tv/*' => Http::response(
                '<html><head>'
                .'<meta property="og:title" content="Edited Movie">'
                .'<meta property="og:image" content="https://images.plex.tv/photo?url=edited">'
                .'</head></html>',
                200,
            ),
        ]);

        $adder = User::factory()->create();
        User::factory()->create();
        $movie = Movie::factory()->create([
            'added_by_user_id' => $adder->id,
            'title' => 'Old Title',
            'plex_url' => null,
            'poster_url' => null,
        ]);

        $this->actingAs($adder)
            ->patch("/apps/our-corner/movies/{$movie->id}", [
                'title' => 'New Title',
                'plex_url' => 'https://watch.plex.tv/movie/y',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('corner_movies', [
            'id' => $movie->id,
            'title' => 'New Title',
            'plex_url' => 'https://watch.plex.tv/movie/y',
            // SERVER-derived from the faked og:image.
            'poster_url' => 'https://images.plex.tv/photo?url=edited',
        ]);

        // Edit is silent — no push on update.
        Notification::assertNothingSent();
    }

    public function test_non_owner_cannot_update_movie(): void
    {
        $adder = User::factory()->create();
        $other = User::factory()->create();
        $movie = Movie::factory()->create(['added_by_user_id' => $adder->id]);

        $this->actingAs($other)
            ->patch("/apps/our-corner/movies/{$movie->id}", ['title' => 'Hijacked'])
            ->assertForbidden();
    }

    public function test_update_movie_rejects_non_plex_url(): void
    {
        $adder = User::factory()->create();
        $movie = Movie::factory()->create(['added_by_user_id' => $adder->id]);

        $this->actingAs($adder)
            ->from('/apps/our-corner/movies')
            ->patch("/apps/our-corner/movies/{$movie->id}", [
                'title' => 'X',
                'plex_url' => 'https://evil.com/x',
            ])
            ->assertSessionHasErrors(['plex_url']);
    }

    public function test_rejects_non_plex_plex_url(): void
    {
        Notification::fake();

        $adder = User::factory()->create();
        User::factory()->create();

        $this->actingAs($adder)
            ->from('/apps/our-corner/movies')
            ->post('/apps/our-corner/movies', [
                'title' => 'X',
                'plex_url' => 'https://evil.com/x',
            ])
            ->assertSessionHasErrors(['plex_url']);

        $this->assertSame(0, Movie::count());
    }

    public function test_movie_resource_exposes_plex_url(): void
    {
        $user = User::factory()->create();
        Movie::factory()->withPlex()->create(['added_by_user_id' => $user->id]);

        $this->actingAs($user)
            ->get('/apps/our-corner/movies')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('MiniApps/Corner/Pages/Movies/Index')
                ->where('movies.data.0.plex_url', 'https://watch.plex.tv/movie/the-man-from-earth'));
    }

    public function test_movies_index_uses_cursor_keyset_with_id_tiebreaker(): void
    {
        $user = User::factory()->create();

        // Identical added_at across all three so ONLY the id tiebreaker decides order.
        $ts = now()->setMicroseconds(0);
        $m1 = Movie::factory()->create(['added_by_user_id' => $user->id, 'added_at' => $ts]);
        $m2 = Movie::factory()->create(['added_by_user_id' => $user->id, 'added_at' => $ts]);
        $m3 = Movie::factory()->create(['added_by_user_id' => $user->id, 'added_at' => $ts]);

        $this->actingAs($user)
            ->get('/apps/our-corner/movies')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('MiniApps/Corner/Pages/Movies/Index')
                ->has('movies.data', 3)
                // added_at DESC, then id DESC → newest id first, stable.
                ->where('movies.data.0.id', $m3->id)
                ->where('movies.data.1.id', $m2->id)
                ->where('movies.data.2.id', $m1->id)
                // cursorPaginate() omits offset meta (a LengthAwarePaginator would expose
                // these).
                ->missing('movies.total')
                ->missing('movies.last_page')
                ->missing('movies.current_page'));
    }
}
