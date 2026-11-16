<?php

namespace App\MiniApps\History\Support;

use App\MiniApps\History\Http\Resources\EventResource;
use App\MiniApps\History\Models\Event;
use Illuminate\Http\Request;

/**
 * The moment named by `?moment={id}`, so a link or a refresh can open its sheet even when it is
 * past the first page. An unknown, deleted or unviewable id gives null, and the page drops the
 * param; a 404 would only confirm what exists.
 */
final class RequestedMoment
{
    public const PARAM = 'moment';

    /** @return array<string, mixed>|null */
    public static function from(Request $request): ?array
    {
        $raw = $request->query(self::PARAM);
        $viewer = $request->user();

        if (! is_string($raw) || ! ctype_digit($raw) || $viewer === null) {
            return null;
        }

        $event = Event::query()
            ->with(['media', 'changes.user'])
            ->find((int) $raw);

        if ($event === null || $viewer->cannot('view', $event)) {
            return null;
        }

        return app(EventResource::class)($event, $viewer);
    }

    public static function url(int $eventId): string
    {
        return route('apps.our-history.timeline', [self::PARAM => $eventId], false);
    }
}
