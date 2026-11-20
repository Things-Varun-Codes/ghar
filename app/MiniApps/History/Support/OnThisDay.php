<?php

namespace App\MiniApps\History\Support;

use App\MiniApps\History\Models\Event;
use App\Shell\Support\Region;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;

/**
 * The one answer to "which moments happened on this day", for the Dashboard line, the Calendar
 * and Timeline strips and the morning digest. "Today" is the household's, and only earlier years
 * count. A Feb 29 has no day of its own in a non-leap year, so it comes round on Feb 28.
 */
final class OnThisDay
{
    /**
     * Newest first. Chain forResource() when the moments go to a page.
     *
     * @return Builder<Event>
     */
    public static function query(?CarbonInterface $today = null): Builder
    {
        $today ??= Region::today();

        return Event::query()
            ->whereYear('occurred_on', '<', $today->year)
            ->whereMonth('occurred_on', $today->month)
            ->when(
                self::takesLeapDay($today),
                fn (Builder $query) => $query->where(fn (Builder $days) => $days
                    ->whereDay('occurred_on', 28)
                    ->orWhereDay('occurred_on', 29)),
                fn (Builder $query) => $query->whereDay('occurred_on', $today->day),
            )
            ->orderByDesc('occurred_on')
            ->orderByDesc('id');
    }

    /** Whether $date, in an earlier year, comes round on $today: a moment's day or a birthday. */
    public static function comesRoundOn(CarbonInterface $date, ?CarbonInterface $today = null): bool
    {
        $today ??= Region::today();

        return $date->year < $today->year && self::sameDayOfYear($date, $today);
    }

    /** Month and day match, with a Feb 29 landing on Feb 28 of a non-leap year. */
    public static function sameDayOfYear(CarbonInterface $date, CarbonInterface $day): bool
    {
        if ($date->month === $day->month && $date->day === $day->day) {
            return true;
        }

        return $date->month === 2 && $date->day === 29 && self::takesLeapDay($day);
    }

    private static function takesLeapDay(CarbonInterface $day): bool
    {
        return $day->month === 2 && $day->day === 28 && ! $day->isLeapYear();
    }
}
