<?php

namespace App\MiniApps\History\Controllers;

use App\MiniApps\History\Actions\CreateEvent;
use App\MiniApps\History\Actions\DeleteEvent;
use App\MiniApps\History\Actions\UpdateEvent;
use App\MiniApps\History\Http\Requests\StoreEventRequest;
use App\MiniApps\History\Http\Requests\UpdateEventRequest;
use App\MiniApps\History\Http\Resources\EventResource;
use App\MiniApps\History\Models\Event;
use App\Shell\Services\PushDispatcher;
use App\Shell\Support\CursorPayload;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class EventsController
{
    public function index(Request $request): Response
    {
        $direction = $request->query('order') === 'oldest-first' ? 'asc' : 'desc';
        $orderLabel = $direction === 'asc' ? 'oldest-first' : 'newest-first';

        // The id tiebreaker makes the keyset a stable total order; occurred_on and created_at
        // aren't unique.
        $viewer = $request->user();
        $events = Event::query()
            ->with(['media', 'changes.user'])
            ->orderBy('occurred_on', $direction)
            ->orderBy('created_at', $direction)
            ->orderBy('id', $direction)
            ->cursorPaginate(20)
            ->withQueryString();

        // yearCounts gives each YearBanner its true total, rather than what has scrolled in so
        // far.
        return Inertia::render('MiniApps/History/Pages/Timeline', [
            'events' => CursorPayload::make($events, fn (Event $event) => app(EventResource::class)($event, $viewer)),
            'order' => $orderLabel,
            'eventsCount' => Event::query()->count(),
            'lastEventOccurredOn' => Event::query()->max('occurred_on'),
            'yearCounts' => Event::query()
                ->toBase()
                ->pluck('occurred_on')
                ->groupBy(fn (string $date) => (int) substr($date, 0, 4))
                ->map->count(),
        ]);
    }

    public function store(StoreEventRequest $request, CreateEvent $action): RedirectResponse
    {
        $event = $action($request, $request->user());

        $actor = $request->user();
        $firstName = $actor->firstName();
        app(PushDispatcher::class)->toHousehold(
            $actor,
            'our-history',
            'our-history',
            "{$firstName} added a moment: ".($event->title ?? 'untitled'),
            "/apps/our-history#event-{$event->id}",
        );

        // The client needs the new id to drain uploads staged before the save.
        return redirect()->route('apps.our-history.timeline')
            ->with('created_event_id', $event->id);
    }

    public function update(Event $event, UpdateEventRequest $request, UpdateEvent $action): RedirectResponse
    {
        Gate::authorize('update', $event);

        $action($event, $request, $request->user());

        return redirect()->route('apps.our-history.timeline');
    }

    public function destroy(Event $event, Request $request, DeleteEvent $action): RedirectResponse
    {
        Gate::authorize('delete', $event);

        $action($event, $request->user());

        return redirect()->route('apps.our-history.timeline');
    }
}
