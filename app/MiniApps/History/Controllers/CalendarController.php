<?php

namespace App\MiniApps\History\Controllers;

use App\MiniApps\History\Http\Resources\EventResource;
use App\MiniApps\History\Models\Event;
use App\MiniApps\History\Support\LinkedThings;
use App\MiniApps\History\Support\RequestedMoment;
use App\Shell\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CalendarController
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $availableYears = Event::query()
            ->pluck('occurred_on')
            ->map(fn ($date) => (int) $date->year)
            ->unique()
            ->sortDesc()
            ->values()
            ->all();

        // The most recent year with events, not the current one, which is often empty for a
        // backfilled history.
        $year = $request->query('year')
            ? (int) $request->query('year')
            : ($availableYears[0] ?? (int) now()->year);

        $events = Event::query()
            ->with(['media', 'changes.user'])
            ->whereYear('occurred_on', $year)
            ->orderBy('occurred_on')
            ->orderBy('created_at')
            ->get();
        $events = self::present($events, $user);

        $today = now();
        $onThisDay = Event::query()
            ->with(['media', 'changes.user'])
            ->whereMonth('occurred_on', $today->month)
            ->whereDay('occurred_on', $today->day)
            ->orderByDesc('occurred_on')
            ->get();
        $onThisDay = self::present($onThisDay, $user);

        return Inertia::render('MiniApps/History/Pages/Calendar', [
            'events' => $events,
            'onThisDay' => $onThisDay,
            'year' => $year,
            'availableYears' => $availableYears,
            'eventsCount' => count($events),
            'moment' => fn () => RequestedMoment::from($request),
        ]);
    }

    /**
     * @param  Collection<int, Event>  $events
     * @return list<array<string, mixed>>
     */
    private static function present(Collection $events, ?User $viewer): array
    {
        $links = LinkedThings::forEvents($events);

        return $events
            ->map(fn (Event $event) => app(EventResource::class)($event, $viewer, $links[$event->id] ?? []))
            ->values()
            ->all();
    }
}
