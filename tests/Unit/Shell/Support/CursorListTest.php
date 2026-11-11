<?php

namespace Tests\Unit\Shell\Support;

use App\MiniApps\Corner\Models\Movie;
use App\Shell\Models\User;
use App\Shell\Support\CursorList;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CursorListTest extends TestCase
{
    use RefreshDatabase;

    private function transform(): \Closure
    {
        return fn (Movie $m) => ['id' => $m->id, 'title' => $m->title];
    }

    public function test_status_scoping_filters_rows_by_nullable_column(): void
    {
        $user = User::factory()->create();

        $active1 = Movie::factory()->create(['added_by_user_id' => $user->id, 'done_at' => null]);
        $active2 = Movie::factory()->create(['added_by_user_id' => $user->id, 'done_at' => null]);
        $done1 = Movie::factory()->create(['added_by_user_id' => $user->id, 'done_at' => now()]);

        $base = fn () => Movie::query()->orderByDesc('added_at')->orderByDesc('id');

        $activeResult = CursorList::make($base())->status('done_at')->paginate('active', 50, $this->transform());
        $doneResult = CursorList::make($base())->status('done_at')->paginate('done', 50, $this->transform());
        $allResult = CursorList::make($base())->status('done_at')->paginate('all', 50, $this->transform());

        $this->assertCount(2, $activeResult['data']);
        $this->assertEqualsCanonicalizing(
            [$active1->id, $active2->id],
            array_column($activeResult['data'], 'id'),
        );

        $this->assertCount(1, $doneResult['data']);
        $this->assertSame($done1->id, $doneResult['data'][0]['id']);

        $this->assertCount(3, $allResult['data']);
    }

    public function test_counts_are_authoritative_beyond_page_one(): void
    {
        $user = User::factory()->create();

        // 5 rows, 3 active + 2 done, perPage = 2 so only page 1 (2 rows) returns.
        Movie::factory()->count(3)->create(['added_by_user_id' => $user->id, 'done_at' => null]);
        Movie::factory()->count(2)->create(['added_by_user_id' => $user->id, 'done_at' => now()]);

        $base = Movie::query()->orderByDesc('added_at')->orderByDesc('id');

        $result = CursorList::make($base)->status('done_at')->paginate('all', 2, $this->transform());

        $this->assertCount(2, $result['data']); // page 1 truncated by perPage
        $this->assertSame(5, $result['counts']['all']);
        $this->assertSame(3, $result['counts']['active']);
        $this->assertSame(2, $result['counts']['done']);
        $this->assertSame($result['counts']['all'], $result['counts']['active'] + $result['counts']['done']);
    }

    public function test_payload_shape_matches_cursor_payload_plus_counts(): void
    {
        $user = User::factory()->create();
        Movie::factory()->count(5)->create(['added_by_user_id' => $user->id]);

        $base = Movie::query()->orderByDesc('added_at')->orderByDesc('id');

        $result = CursorList::make($base)->status('done_at')->paginate('all', 2, $this->transform());

        $this->assertArrayHasKey('data', $result);
        $this->assertArrayHasKey('next_cursor', $result);
        $this->assertArrayHasKey('prev_cursor', $result);
        $this->assertArrayHasKey('next_page_url', $result);
        $this->assertArrayHasKey('prev_page_url', $result);
        $this->assertArrayHasKey('per_page', $result);
        $this->assertArrayHasKey('counts', $result);

        $this->assertNotNull($result['next_page_url']);
        $this->assertSame(2, $result['per_page']);
    }

    public function test_extra_where_on_base_narrows_both_data_and_counts(): void
    {
        $user = User::factory()->create();

        Movie::factory()->create(['added_by_user_id' => $user->id, 'title' => 'Keep Me', 'done_at' => null]);
        Movie::factory()->create(['added_by_user_id' => $user->id, 'title' => 'Keep Me Too', 'done_at' => now()]);
        Movie::factory()->create(['added_by_user_id' => $user->id, 'title' => 'Exclude Me', 'done_at' => null]);

        // Simulates a scoping clause (visibleTo, or a future ?q search WHERE)  applied by the
        // caller BEFORE handing $base to CursorList.
        $base = Movie::query()
            ->where('title', 'like', 'Keep Me%')
            ->orderByDesc('added_at')
            ->orderByDesc('id');

        $result = CursorList::make($base)->status('done_at')->paginate('all', 50, $this->transform());

        $this->assertCount(2, $result['data']);
        $this->assertEqualsCanonicalizing(
            ['Keep Me', 'Keep Me Too'],
            array_column($result['data'], 'title'),
        );

        // Counts narrow too — 2 total (1 active, 1 done), not the DB-wide 3/2/1.
        $this->assertSame(2, $result['counts']['all']);
        $this->assertSame(1, $result['counts']['active']);
        $this->assertSame(1, $result['counts']['done']);
    }
}
