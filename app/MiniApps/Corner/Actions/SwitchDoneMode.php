<?php

namespace App\MiniApps\Corner\Actions;

use App\MiniApps\Corner\Models\CornerList;
use Illuminate\Support\Facades\DB;

/**
 * Moves a list between one shared "done" and each person's own, carrying every mark across so
 * nothing anyone did is lost. Going per-person, whoever marked a thing gets their own mark.
 * Going shared, a thing stays done, credited to the first person who marked it.
 */
class SwitchDoneMode
{
    public function __invoke(CornerList $list, bool $perPerson): void
    {
        if ($list->done_per_person === $perPerson) {
            return;
        }

        DB::transaction(function () use ($list, $perPerson): void {
            $perPerson ? $this->toPerPerson($list) : $this->toShared($list);

            $list->update(['done_per_person' => $perPerson]);
        });
    }

    private function toPerPerson(CornerList $list): void
    {
        DB::statement(
            'insert into corner_item_marks (item_id, user_id, done_at)
             select id, done_by_user_id, done_at from corner_items
             where list_id = ? and done_at is not null and done_by_user_id is not null
             on conflict do nothing',
            [$list->id],
        );

        DB::table('corner_items')
            ->where('list_id', $list->id)
            ->update(['done_at' => null, 'done_by_user_id' => null]);
    }

    private function toShared(CornerList $list): void
    {
        DB::statement(
            'update corner_items set done_at = first.done_at, done_by_user_id = first.user_id
             from (
                 select distinct on (item_id) item_id, user_id, done_at
                 from corner_item_marks
                 order by item_id, done_at, user_id
             ) as first
             where corner_items.id = first.item_id and corner_items.list_id = ?',
            [$list->id],
        );

        DB::table('corner_item_marks')
            ->whereIn('item_id', DB::table('corner_items')->select('id')->where('list_id', $list->id))
            ->delete();
    }
}
