<?php

namespace App\MiniApps\History\Support;

use App\MiniApps\History\Models\Event;
use App\Shell\Services\LinkableEntities;

/**
 * The things moments link to, as they are now. A link in a moment's story was written with the
 * thing's picture at the time; drawing it from here instead follows the thing when its picture
 * changes or goes. A thing that no longer exists, or whose room is off, is simply absent, and the
 * link falls back to what was written.
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

        return app(LinkableEntities::class)->snapshotsFrom('history.event', $ids);
    }
}
