<?php

namespace Tests\Unit\Shell\Support;

use App\MiniApps\Corner\Models\CornerList;
use App\MiniApps\Corner\Models\Item;
use App\Shell\Models\User;
use App\Shell\Support\ListPage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Inertia\ScrollProp;
use Inertia\Support\Header;
use Tests\TestCase;

class ListPageTest extends TestCase
{
    use RefreshDatabase;

    private CornerList $list;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->list = CornerList::factory()->create();
        $this->user = User::factory()->create();
    }

    /** @param  array<string, string>  $query */
    private function page(array $query, ?array $sorts = null): ListPage
    {
        return ListPage::make(
            Request::create('/', 'GET', $query),
            Item::query()->where('list_id', $this->list->id),
            $sorts ?? ListPage::chronological('added_at'),
        );
    }

    private function item(string $title, string $addedAt, bool $done = false): Item
    {
        return Item::factory()->create([
            'list_id' => $this->list->id,
            'added_by_user_id' => $this->user->id,
            'title' => $title,
            'added_at' => $addedAt,
            'done_at' => $done ? now() : null,
        ]);
    }

    public function test_chronological_pairs_end_in_an_id_tiebreak(): void
    {
        $this->assertSame([
            'recent' => [['posted_at', 'desc'], ['id', 'desc']],
            'oldest' => [['posted_at', 'asc'], ['id', 'asc']],
        ], ListPage::chronological('posted_at'));
    }

    public function test_an_unknown_sort_falls_back_to_recent_and_q_is_trimmed(): void
    {
        $page = $this->page(['sort' => 'title', 'q' => '   ']);

        $this->assertSame('recent', $page->sort());
        $this->assertNull($page->q());
        $this->assertSame(['recent', 'oldest'], $page->sortKeys());

        $this->assertSame('x', $this->page(['q' => '  x '])->q());
    }

    public function test_props_order_search_and_name_the_page(): void
    {
        $older = $this->item('Kerala trip', '2024-01-01 10:00:00');
        $newer = $this->item('Kerala food', '2025-01-01 10:00:00');
        $this->item('Goa', '2025-06-01 10:00:00');

        $props = $this->page(['sort' => 'oldest', 'q' => ' kerala '])
            ->searchable(['title'])
            ->props('items', 50, fn (Item $i) => $i->id);

        $this->assertSame(['items', 'sort', 'q'], array_keys($props));
        $this->assertSame('oldest', $props['sort']);
        $this->assertSame('kerala', $props['q']);
        $this->assertInstanceOf(ScrollProp::class, $props['items']);
        $this->assertSame([$older->id, $newer->id], $props['items']()['data']);
        $this->assertSame(['all' => 2, 'active' => 2, 'done' => 0], $props['items']()['counts']);
    }

    public function test_a_status_column_adds_the_filter(): void
    {
        $this->item('Open', '2025-01-01 10:00:00');
        $done = $this->item('Done', '2025-02-01 10:00:00', done: true);

        $props = $this->page(['filter' => 'done'])
            ->status('done_at')
            ->props('items', 50, fn (Item $i) => $i->id);

        $this->assertSame('done', $props['filter']);
        $this->assertSame([$done->id], $props['items']()['data']);
        $this->assertSame(['all' => 2, 'active' => 1, 'done' => 1], $props['items']()['counts']);

        $this->assertNull($this->page(['filter' => 'bogus'])->status('done_at')->filter());
        $this->assertSame('active', $this->page([])->status('done_at')->props('items', 50, fn (Item $i) => $i->id)['filter']);
        $this->assertSame('all', $this->page(['filter' => 'done'])->filter());
    }

    public function test_any_response_but_a_load_more_starts_the_list_over(): void
    {
        $request = Request::create('/', 'GET');
        $request->headers->set(Header::RESET, 'other');
        ListPage::make($request, Item::query(), ListPage::chronological('added_at'))
            ->props('items', 50, fn (Item $i) => $i->id);

        $this->assertSame('other,items', $request->header(Header::RESET));

        $loadMore = Request::create('/', 'GET');
        $loadMore->headers->set(Header::INFINITE_SCROLL_MERGE_INTENT, 'append');
        ListPage::make($loadMore, Item::query(), ListPage::chronological('added_at'))
            ->props('items', 50, fn (Item $i) => $i->id);

        $this->assertNull($loadMore->header(Header::RESET));
    }
}
