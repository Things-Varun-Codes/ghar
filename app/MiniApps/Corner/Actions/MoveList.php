<?php

namespace App\MiniApps\Corner\Actions;

use App\MiniApps\Corner\Models\CornerList;
use Illuminate\Support\Facades\DB;

class MoveList
{
    /** Swaps the list with its neighbour, renumbering the shelf 0..n on the way. */
    public function __invoke(CornerList $list, string $direction): void
    {
        DB::transaction(function () use ($list, $direction): void {
            $ids = CornerList::query()
                ->orderBy('position')
                ->orderBy('id')
                ->lockForUpdate()
                ->pluck('id')
                ->all();

            $from = array_search($list->id, $ids, true);
            $to = $direction === 'up' ? $from - 1 : $from + 1;

            if ($from === false || ! isset($ids[$to])) {
                return;
            }

            [$ids[$from], $ids[$to]] = [$ids[$to], $ids[$from]];

            foreach ($ids as $position => $id) {
                CornerList::query()->whereKey($id)->where('position', '!=', $position)->update(['position' => $position]);
            }
        });
    }
}
