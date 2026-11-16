<?php

namespace Tests\Feature\Corner;

use App\MiniApps\Corner\Models\Activity;
use App\MiniApps\Corner\Models\Place;
use App\MiniApps\Corner\Models\Song;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CornerLandingTest extends TestCase
{
    use RefreshDatabase;

    public function test_landing_renders_lists_grid(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/apps/our-corner');

        $response->assertOk();
        $response->assertInertia(
            fn ($page) => $page
                ->component('MiniApps/Corner/Pages/Landing')
                ->has('cornerSummary.counts.songs')
                ->has('cornerSummary.counts.movies')
                ->has('cornerSummary.counts.activities')
                ->has('cornerSummary.counts.places')
                ->missing('cornerSummary.counts.messages')
                ->missing('cornerSummary.counts.challans'),
        );
    }

    public function test_landing_supplies_done_counts_and_a_peek_per_list(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        Song::factory()->count(6)->create(['added_by_user_id' => $user->id]);
        Song::factory()->create(['added_by_user_id' => $user->id, 'done_at' => now(), 'thumbnail_url' => null]);
        Activity::factory()->create(['added_by_user_id' => $user->id, 'title' => 'Old walk', 'added_at' => now()->subDays(3)]);
        Activity::factory()->create(['added_by_user_id' => $user->id, 'title' => 'Picnic', 'added_at' => now()->subDay(), 'done_at' => now()]);
        Activity::factory()->create(['added_by_user_id' => $user->id, 'title' => 'Pottery', 'added_at' => now()]);
        Activity::factory()->create(['added_by_user_id' => $user->id, 'title' => 'Oldest', 'added_at' => now()->subDays(9)]);
        Place::factory()->create(['added_by_user_id' => $user->id, 'title' => 'The bakery', 'address' => '1 High St', 'added_at' => now()]);

        $this->actingAs($user)
            ->get('/apps/our-corner')
            ->assertInertia(fn ($page) => $page
                ->where('cornerSummary.counts.songs', 7)
                ->where('cornerSummary.done.songs', 1)
                ->where('cornerSummary.done.activities', 1)
                ->has('cornerSummary.peeks.songs.images', 5)
                ->has('cornerSummary.peeks.movies.images', 0)
                ->where('cornerSummary.peeks.activities.items', [
                    ['title' => 'Pottery', 'done' => false],
                    ['title' => 'Picnic', 'done' => true],
                    ['title' => 'Old walk', 'done' => false],
                ])
                ->where('cornerSummary.peeks.places', ['title' => 'The bakery', 'address' => '1 High St']));
    }

    public function test_an_empty_corner_has_empty_peeks(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/apps/our-corner')
            ->assertInertia(fn ($page) => $page
                ->where('cornerSummary.counts.places', 0)
                ->has('cornerSummary.peeks.songs.images', 0)
                ->has('cornerSummary.peeks.activities.items', 0)
                ->where('cornerSummary.peeks.places', null));
    }
}
