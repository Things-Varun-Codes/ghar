<?php

namespace Tests\Feature\Corner;

use App\MiniApps\Corner\Models\CornerList;
use App\MiniApps\Corner\Models\Item;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia;
use Tests\Feature\Corner\Concerns\MakesCornerLists;
use Tests\TestCase;

class CornerLandingTest extends TestCase
{
    use MakesCornerLists;
    use RefreshDatabase;

    public function test_a_fresh_install_has_no_lists_and_may_make_one(): void
    {
        $this->actingAs(User::factory()->create())
            ->get('/apps/our-shelf')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('MiniApps/Corner/Pages/Landing')
                ->where('lists', [])
                ->where('can.create', true));
    }

    public function test_each_list_has_its_settings_counts_and_a_peek_at_its_newest_items(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $songs = $this->songs();
        $movies = $this->movies();
        $activities = $this->activities();

        $covers = [];
        foreach (range(1, 6) as $i) {
            $covers[$i] = $this->itemIn($songs, $user, [
                'title' => "Song {$i}",
                'image_url' => "https://images.example.com/cover-{$i}.jpg",
                'added_at' => now()->subMinutes(10 - $i),
            ]);
        }
        // The newest song has no picture: its peek entry says so rather than borrowing one.
        $this->itemIn($songs, $other, ['title' => 'Bare', 'image_url' => null, 'added_at' => now(), 'done_at' => now(), 'done_by_user_id' => $user->id]);

        $this->itemIn($activities, $user, ['title' => 'Old walk', 'added_at' => now()->subDays(3)]);
        $this->itemIn($activities, $user, ['title' => 'Picnic', 'added_at' => now()->subDay(), 'done_at' => now(), 'done_by_user_id' => $user->id]);
        $this->itemIn($activities, $user, ['title' => 'Pottery', 'added_at' => now()]);

        $this->actingAs($user)
            ->get('/apps/our-shelf')
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->has('lists', 3)
                ->where('lists.0.id', $songs->id)
                ->where('lists.0.slug', 'songs')
                ->where('lists.0.name', 'Songs')
                ->where('lists.0.icon', 'music')
                ->where('lists.0.done_label', 'Loved')
                ->where('lists.0.todo_label', 'Playlist')
                ->where('lists.0.done_icon', 'heart')
                ->where('lists.0.notify_on_add', true)
                ->missing('lists.0.kind')
                ->where('lists.0.count', 7)
                ->where('lists.0.done', 1)
                ->where('lists.0.peek', [
                    ['title' => 'Bare', 'done' => true, 'picture_url' => null],
                    ['title' => 'Song 6', 'done' => false, 'picture_url' => $covers[6]->pictureUrl()],
                    ['title' => 'Song 5', 'done' => false, 'picture_url' => $covers[5]->pictureUrl()],
                    ['title' => 'Song 4', 'done' => false, 'picture_url' => $covers[4]->pictureUrl()],
                    ['title' => 'Song 3', 'done' => false, 'picture_url' => $covers[3]->pictureUrl()],
                ])
                ->where('lists.1.id', $movies->id)
                ->where('lists.1.count', 0)
                ->where('lists.1.done', 0)
                ->where('lists.1.peek', [])
                ->where('lists.2.id', $activities->id)
                ->where('lists.2.count', 3)
                ->where('lists.2.done', 1)
                ->where('lists.2.peek', [
                    ['title' => 'Pottery', 'done' => false, 'picture_url' => null],
                    ['title' => 'Picnic', 'done' => true, 'picture_url' => null],
                    ['title' => 'Old walk', 'done' => false, 'picture_url' => null],
                ]));

        $this->assertStringStartsWith("/apps/our-shelf/items/{$covers[6]->id}/picture?v=", (string) $covers[6]->pictureUrl());
    }

    public function test_empty_lists_have_empty_peeks(): void
    {
        $this->songs();
        $this->places();

        $this->actingAs(User::factory()->create())
            ->get('/apps/our-shelf')
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('lists.0.peek', [])
                ->where('lists.1.peek', [])
                ->where('lists.1.count', 0));
    }

    public function test_the_landing_query_count_does_not_grow_with_lists(): void
    {
        $user = User::factory()->create();
        foreach ([$this->songs(), $this->movies(), $this->activities(), $this->places()] as $list) {
            Item::factory()->count(3)->create(['list_id' => $list->id, 'added_by_user_id' => $user->id]);
        }

        $queries = function () use ($user): int {
            DB::flushQueryLog();
            DB::enableQueryLog();
            $this->actingAs($user)->get('/apps/our-shelf')->assertOk();
            DB::disableQueryLog();

            return count(DB::getQueryLog());
        };

        // The first request also loads the viewer's roles, which stay on the model.
        $queries();
        $withFour = $queries();

        $more = CornerList::factory()->count(3)->create();
        foreach ($more as $list) {
            Item::factory()->count(2)->create(['list_id' => $list->id, 'added_by_user_id' => $user->id]);
        }

        $this->assertSame($withFour, $queries());
    }
}
