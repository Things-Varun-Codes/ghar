<?php

namespace App\MiniApps\History\Support;

use App\MiniApps\History\Models\Event;
use Illuminate\Database\Eloquent\Builder;

/**
 * The one answer to "which moments happened on this day", for the Dashboard line, the Calendar
 * and Timeline strips and the morning digest.
 */
final class OnThisDay
{
    /**
     * Newest first. Chain forResource() when the moments go to a page.
     *
     * @return Builder<Event>
     */
    public static function query(): Builder
    {
        $today = now();

        return Event::query()
            ->whereMonth('occurred_on', $today->month)
            ->whereDay('occurred_on', $today->day)
            ->orderByDesc('occurred_on')
            ->orderByDesc('id');
    }
}
