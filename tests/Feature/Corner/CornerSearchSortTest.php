<?php

namespace Tests\Feature\Corner;

use App\MiniApps\Corner\Models\Song;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class CornerSearchSortTest extends TestCase
{
    use RefreshDatabase;

    public function test_search_narrows_data_and_counts(): void
    {
        $user = User::factory()->create();

        $match = Song::factory()->create([
            'added_by_user_id' => $user->id,
            'title' => 'Bohemian Rhapsody',
            'author' => 'Queen',
        ]);
        Song::factory()->create([
            'added_by_user_id' => $user->id,
            'title' => 'Imagine',
            'author' => 'John Lennon',
        ]);

        $this->actingAs($user)
            ->get('/apps/our-corner/songs?q=bohemian')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('songs.data', 1)
                ->where('songs.data.0.id', $match->id)
                ->where('songs.counts.all', 1)
                ->where('q', 'bohemian'));
    }

    public function test_search_matches_author_column_too(): void
    {
        $user = User::factory()->create();

        $match = Song::factory()->create([
            'added_by_user_id' => $user->id,
            'title' => 'Some Song',
            'author' => 'Radiohead',
        ]);
        Song::factory()->create([
            'added_by_user_id' => $user->id,
            'title' => 'Other Song',
            'author' => 'Someone Else',
        ]);

        $this->actingAs($user)
            ->get('/apps/our-corner/songs?q=radiohead')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('songs.data', 1)
                ->where('songs.data.0.id', $match->id));
    }

    public function test_sort_title_orders_asc(): void
    {
        $user = User::factory()->create();

        Song::factory()->create(['added_by_user_id' => $user->id, 'title' => 'Zebra Song']);
        Song::factory()->create(['added_by_user_id' => $user->id, 'title' => 'Alpha Song']);

        $this->actingAs($user)
            ->get('/apps/our-corner/songs?sort=title')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('sort', 'title')
                ->where('songs.data.0.title', 'Alpha Song')
                ->where('songs.data.1.title', 'Zebra Song'));
    }

    public function test_sort_artist_orders_by_author_asc(): void
    {
        $user = User::factory()->create();

        Song::factory()->create(['added_by_user_id' => $user->id, 'title' => 'A', 'author' => 'Zeta Artist']);
        Song::factory()->create(['added_by_user_id' => $user->id, 'title' => 'B', 'author' => 'Alpha Artist']);

        $this->actingAs($user)
            ->get('/apps/our-corner/songs?sort=artist')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('sort', 'artist')
                ->where('songs.data.0.author', 'Alpha Artist')
                ->where('songs.data.1.author', 'Zeta Artist'));
    }

    public function test_sort_garbage_falls_back_to_recent(): void
    {
        $user = User::factory()->create();

        $older = Song::factory()->create([
            'added_by_user_id' => $user->id,
            'added_at' => Carbon::now()->subDay(),
        ]);
        $newer = Song::factory()->create([
            'added_by_user_id' => $user->id,
            'added_at' => Carbon::now(),
        ]);

        $this->actingAs($user)
            ->get('/apps/our-corner/songs?sort=garbage')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('sort', 'recent')
                ->where('songs.data.0.id', $newer->id)
                ->where('songs.data.1.id', $older->id));
    }

    public function test_no_sort_param_yields_byte_identical_default_order(): void
    {
        $user = User::factory()->create();

        $older = Song::factory()->create([
            'added_by_user_id' => $user->id,
            'added_at' => Carbon::now()->subDay(),
        ]);
        $newer = Song::factory()->create([
            'added_by_user_id' => $user->id,
            'added_at' => Carbon::now(),
        ]);

        $this->actingAs($user)
            ->get('/apps/our-corner/songs')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('sort', 'recent')
                ->where('q', null)
                ->where('songs.data.0.id', $newer->id)
                ->where('songs.data.1.id', $older->id));
    }
}
