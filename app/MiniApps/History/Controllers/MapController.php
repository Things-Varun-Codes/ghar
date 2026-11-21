<?php

namespace App\MiniApps\History\Controllers;

use App\MiniApps\History\Models\Event;
use App\MiniApps\History\Support\MemberBirthdays;
use App\MiniApps\History\Support\RequestedMoment;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MapController
{
    public function index(Request $request): Response
    {
        // Every located moment at once, a few fields each: the sheet fetches the full moment
        // through `moment` when one is opened.
        $points = Event::query()
            ->whereNotNull('location_lat')
            ->whereNotNull('location_lng')
            ->orderByDesc('occurred_on')
            ->orderByDesc('created_at')
            ->get(['id', 'occurred_on', 'title', 'location_name', 'location_address', 'location_freetext', 'location_lat', 'location_lng'])
            ->map(fn (Event $event): array => [
                'id' => $event->id,
                'date_label' => $event->occurred_on->format('j M Y'),
                'title' => $event->title,
                'location_name' => $event->location_name,
                'location_address' => $event->location_address,
                'location_freetext' => $event->location_freetext,
                'lat' => (float) $event->location_lat,
                'lng' => (float) $event->location_lng,
            ])
            ->all();

        // A place was typed but never picked, so it has nowhere to go on the map.
        $unplaced = Event::query()
            ->where(fn ($q) => $q->whereNull('location_lat')->orWhereNull('location_lng'))
            ->where(fn ($q) => $q->whereNotNull('location_name')->orWhereNotNull('location_freetext'))
            ->count();

        return Inertia::render('MiniApps/History/Pages/Map', [
            'points' => $points,
            'unplacedCount' => $unplaced,
            'birthdays' => fn () => MemberBirthdays::forForm(),
            'moment' => fn () => RequestedMoment::from($request),
        ]);
    }
}
