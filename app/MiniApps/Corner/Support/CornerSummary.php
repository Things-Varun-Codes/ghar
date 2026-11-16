<?php

namespace App\MiniApps\Corner\Support;

use App\MiniApps\Corner\Http\Resources\ListResource;
use App\MiniApps\Corner\Models\CornerList;
use App\Shell\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Everything on the Corner landing: each list with a count, a done count and a peek at what
 * is in it. Corner items are the whole household's, so only the `can` flags depend on the
 * viewer.
 */
class CornerSummary
{
    /** More than a door can show on a wide screen; the CSS clips what doesn't fit. */
    private const COVERS = 5;

    private const TITLES = 3;

    /**
     * @return list<array<string, mixed>>
     */
    public static function build(User $viewer): array
    {
        $lists = CornerList::query()->orderBy('position')->orderBy('id')->get();

        if ($lists->isEmpty()) {
            return [];
        }

        $tallies = DB::table('corner_items')
            ->selectRaw('list_id, count(*) as total, count(done_at) as done, count(*) filter (where added_by_user_id <> ?) as by_others', [$viewer->id])
            ->groupBy('list_id')
            ->get()
            ->keyBy('list_id');

        $recent = self::recentItems();

        return $lists->map(function (CornerList $list) use ($viewer, $tallies, $recent): array {
            $tally = $tallies->get($list->id);
            $items = $recent[$list->id] ?? [];

            return app(ListResource::class)($list, $viewer, (int) ($tally->by_others ?? 0)) + [
                'count' => (int) ($tally->total ?? 0),
                'done' => (int) ($tally->done ?? 0),
                'peek' => self::peek($list->kind, $items),
            ];
        })->all();
    }

    /**
     * @param  list<object>  $items  newest first
     * @return array{images: list<string>}|array{items: list<array{title: string, done: bool}>}|array{place: array{title: string, address: ?string}|null}
     */
    private static function peek(ListKind $kind, array $items): array
    {
        return match ($kind) {
            ListKind::Link, ListKind::Poster => [
                'images' => array_values(array_filter(array_map(fn (object $i): ?string => $i->image_url, $items))),
            ],
            ListKind::Place => [
                'place' => $items === [] ? null : ['title' => $items[0]->title, 'address' => $items[0]->address],
            ],
            ListKind::Plain => [
                'items' => array_map(
                    fn (object $i): array => ['title' => $i->title, 'done' => $i->done_at !== null],
                    array_slice($items, 0, self::TITLES),
                ),
            ],
        };
    }

    /**
     * The newest few items of every list in one query. An item without artwork is still
     * returned, so a list of links nobody could look up shows an empty frame rather than
     * older covers.
     *
     * @return array<int, list<object>>
     */
    private static function recentItems(): array
    {
        $ranked = DB::table('corner_items')
            ->select(['list_id', 'title', 'image_url', 'address', 'done_at'])
            ->selectRaw('row_number() over (partition by list_id order by added_at desc, id desc) as rank');

        $rows = DB::query()
            ->fromSub($ranked, 'ranked')
            ->where('rank', '<=', self::COVERS)
            ->orderBy('list_id')
            ->orderBy('rank')
            ->get();

        $byList = [];
        foreach ($rows as $row) {
            $byList[(int) $row->list_id][] = $row;
        }

        return $byList;
    }
}
