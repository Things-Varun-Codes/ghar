<?php

namespace App\MiniApps\History\Controllers;

use App\MiniApps\History\Http\Resources\EventResource;
use App\MiniApps\History\Models\Event;
use App\MiniApps\History\Support\LinkedThings;
use App\MiniApps\History\Support\MemberBirthdays;
use App\MiniApps\History\Support\OnThisDay;
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
            ->forResource()
            ->whereYear('occurred_on', $year)
            ->orderBy('occurred_on')
            ->orderBy('created_at')
            ->get();

        $onThisDay = OnThisDay::query()->forResource()->get();

        // One lookup for both: a moment on this day is often also in this year.
        $links = LinkedThings::forEvents($events->concat($onThisDay));
        $events = self::present($events, $user, $links);
        $onThisDay = self::present($onThisDay, $user, $links);

        return Inertia::render('MiniApps/History/Pages/Calendar', [
            'events' => $events,
            'onThisDay' => $onThisDay,
            'year' => $year,
            'availableYears' => $availableYears,
            'eventsCount' => count($events),
            'birthdays' => fn () => MemberBirthdays::forForm(),
            'moment' => fn () => RequestedMoment::from($request),
        ]);
    }

    /**
     * @param  Collection<int, Event>  $events
     * @param  array<int, array<string, array<string, mixed>>>  $links
     * @return list<array<string, mixed>>
     */
    private static function present(Collection $events, ?User $viewer, array $links): array
    {
        return $events
            ->map(fn (Event $event) => app(EventResource::class)($event, $viewer, $links[$event->id] ?? []))
            ->values()
            ->all();
    }
}
