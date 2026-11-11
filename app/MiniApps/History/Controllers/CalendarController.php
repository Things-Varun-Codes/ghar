<?php

namespace App\MiniApps\History\Controllers;

use App\MiniApps\History\Http\Resources\EventResource;
use App\MiniApps\History\Models\Event;
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
            ->get()
            ->map(fn (Event $event) => app(EventResource::class)($event, $user))
            ->all();

        $today = now();
        $onThisDay = Event::query()
            ->with(['media', 'changes.user'])
            ->whereMonth('occurred_on', $today->month)
            ->whereDay('occurred_on', $today->day)
            ->orderByDesc('occurred_on')
            ->get()
            ->map(fn (Event $event) => app(EventResource::class)($event, $user))
            ->all();

        return Inertia::render('MiniApps/History/Pages/Calendar', [
            'events' => $events,
            'onThisDay' => $onThisDay,
            'year' => $year,
            'availableYears' => $availableYears,
            'eventsCount' => count($events),
        ]);
    }
}
