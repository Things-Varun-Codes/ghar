<?php

namespace App\MiniApps\Corner\Support;

use App\MiniApps\Corner\Http\Resources\ListResource;
use App\MiniApps\Corner\Models\CornerList;
use App\MiniApps\Corner\Models\Item;
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
    private const PEEK = 5;

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

            return app(ListResource::class)($list, $viewer, (int) ($tally->by_others ?? 0)) + [
                'count' => (int) ($tally->total ?? 0),
                'done' => (int) ($tally->done ?? 0),
                'peek' => $recent[$list->id] ?? [],
            ];
        })->all();
    }

    /**
     * The newest few items of every list in one query, each with its picture if it has one.
     * The door shows pictures when there are any and names otherwise.
     *
     * @return array<int, list<array{title: string, done: bool, picture_url: ?string}>>
     */
    private static function recentItems(): array
    {
        $ranked = DB::table('corner_items')
            ->select(['id', 'list_id', 'title', 'image_url', 'done_at'])
            ->selectRaw('row_number() over (partition by list_id order by added_at desc, id desc) as rank');

        $rows = DB::query()
            ->fromSub($ranked, 'ranked')
            ->where('rank', '<=', self::PEEK)
            ->orderBy('list_id')
            ->orderBy('rank')
            ->get();

        $byList = [];
        foreach ($rows as $row) {
            $byList[(int) $row->list_id][] = [
                'title' => (string) $row->title,
                'done' => $row->done_at !== null,
                'picture_url' => Item::pictureUrlFor((int) $row->id, $row->image_url),
            ];
        }

        return $byList;
    }
}
