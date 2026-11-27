<?php

namespace App\MiniApps\Corner\Support;

use App\MiniApps\Corner\Http\Resources\ListResource;
use App\MiniApps\Corner\Models\CornerList;
use App\MiniApps\Corner\Models\Item;
use App\Shell\Models\User;
use App\Shell\Support\PersonalOrder;
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
        $lists = PersonalOrder::apply(CornerList::query(), $viewer, CornerList::ORDER_SCOPE)->get();

        if ($lists->isEmpty()) {
            return [];
        }

        $tallies = DB::table('corner_items')
            ->selectRaw('list_id, count(*) as total, count(done_at) as done, count(*) filter (where added_by_user_id <> ?) as by_others', [$viewer->id])
            ->groupBy('list_id')
            ->get()
            ->keyBy('list_id');

        // On a per-person list "done" is the viewer's own: how many they have marked.
        $mine = DB::table('corner_item_marks')
            ->join('corner_items', 'corner_items.id', '=', 'corner_item_marks.item_id')
            ->where('corner_item_marks.user_id', $viewer->id)
            ->selectRaw('corner_items.list_id, count(*) as done')
            ->groupBy('corner_items.list_id')
            ->pluck('done', 'list_id');

        $recent = self::recentItems($viewer);

        return $lists->map(function (CornerList $list) use ($viewer, $tallies, $mine, $recent): array {
            $tally = $tallies->get($list->id);

            return app(ListResource::class)($list, $viewer, (int) ($tally->by_others ?? 0)) + [
                'count' => (int) ($tally->total ?? 0),
                'done' => $list->done_per_person ? (int) ($mine[$list->id] ?? 0) : (int) ($tally->done ?? 0),
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
    private static function recentItems(User $viewer): array
    {
        // A shared list's done_at, or the viewer's own mark on a per-person list (whose items keep
        // done_at empty), whichever is set.
        $ranked = DB::table('corner_items')
            ->leftJoin('corner_item_marks as mine', fn ($join) => $join
                ->on('mine.item_id', '=', 'corner_items.id')
                ->where('mine.user_id', '=', $viewer->id))
            ->select(['corner_items.id', 'corner_items.list_id', 'corner_items.title', 'corner_items.image_url'])
            ->selectRaw('coalesce(corner_items.done_at, mine.done_at) as done_at')
            ->selectRaw('row_number() over (partition by corner_items.list_id order by corner_items.added_at desc, corner_items.id desc) as rank');

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
