<?php

namespace App\MiniApps\History\Support;

use App\MiniApps\History\Models\Event;
use App\Shell\Services\LinkableEntities;
use Illuminate\Support\Facades\DB;

/**
 * The things moments link to, as they are now. A link in a moment's story was written with the
 * thing's picture at the time; drawing it from here instead follows the thing when its picture
 * changes or goes. One query for the references and one per linked type, for any number of
 * moments. A thing that no longer exists, or whose room is off, is simply absent, and the link
 * falls back to what was written.
 */
final class LinkedThings
{
    /**
     * @param  iterable<Event>  $events
     * @return array<int, array<string, array<string, mixed>>> event id => "type:id" => snapshot
     */
    public static function forEvents(iterable $events): array
    {
        $ids = [];
        foreach ($events as $event) {
            $ids[] = $event->id;
        }

        if ($ids === []) {
            return [];
        }

        $refs = DB::table('entity_references')
            ->where('from_type', 'history.event')
            ->whereIn('from_id', $ids)
            ->get(['from_id', 'to_type', 'to_id']);

        $snapshots = app(LinkableEntities::class)->snapshotsFor(
            $refs->map(fn (object $ref): array => [(string) $ref->to_type, (int) $ref->to_id]),
        );

        $byEvent = [];
        foreach ($refs as $ref) {
            $key = "{$ref->to_type}:{$ref->to_id}";
            if (isset($snapshots[$key])) {
                $byEvent[(int) $ref->from_id][$key] = $snapshots[$key];
            }
        }

        return $byEvent;
    }
}
