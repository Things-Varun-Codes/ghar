<?php

namespace App\MiniApps\History\Support;

use App\MiniApps\History\Models\Event;
use App\Shell\Models\User;
use Illuminate\Support\Str;

final class DashboardLine
{
    private const TITLE_LIMIT = 60;

    public static function forUser(User $user): ?string
    {
        $today = now();

        $anniversary = Event::query()
            ->whereMonth('occurred_on', $today->month)
            ->whereDay('occurred_on', $today->day)
            ->whereYear('occurred_on', '<', $today->year)
            ->orderByDesc('occurred_on')
            ->orderByDesc('id')
            ->first();

        if ($anniversary !== null) {
            $years = $today->year - $anniversary->occurred_on->year;
            $ago = $years === 1 ? '1 year ago' : "{$years} years ago";
            $title = self::title($anniversary);

            return $title === ''
                ? "On this day, {$ago}"
                : "On this day, {$ago}: {$title}";
        }

        $latest = Event::query()
            ->whereDate('occurred_on', '<=', $today->toDateString())
            ->orderByDesc('occurred_on')
            ->orderByDesc('id')
            ->first();

        if ($latest === null) {
            return null;
        }

        $title = self::title($latest);
        $date = $latest->occurred_on->format('j M Y');

        return $title === ''
            ? "Last moment: {$date}"
            : "Last moment: {$title} · {$date}";
    }

    private static function title(Event $event): string
    {
        return Str::limit(trim((string) $event->title), self::TITLE_LIMIT);
    }
}
