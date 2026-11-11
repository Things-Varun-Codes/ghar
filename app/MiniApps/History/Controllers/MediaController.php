<?php

namespace App\MiniApps\History\Controllers;

use App\MiniApps\History\Actions\AttachMedia;
use App\MiniApps\History\Actions\DetachMedia;
use App\MiniApps\History\Http\Requests\StoreMediaRequest;
use App\MiniApps\History\Models\Event;
use App\Shell\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class MediaController
{
    public function store(Event $event, StoreMediaRequest $request, AttachMedia $action): RedirectResponse
    {
        Gate::authorize('attachMedia', $event);

        $file = $request->file('media');
        /** @var User $actor */
        $actor = auth()->user();

        $mime = $file->getMimeType() ?? '';

        if (str_starts_with($mime, 'video/')) {
            $action->video($event, $file, $request->file('poster'), $actor);
        } else {
            $action->photo($event, $file, $actor);
        }

        return back(303);
    }

    public function destroy(Event $event, Media $media, DetachMedia $action): RedirectResponse
    {
        Gate::authorize('detachMedia', $event);

        abort_if(
            $media->model_type !== Event::class || (int) $media->model_id !== (int) $event->id,
            404,
        );

        /** @var User $actor */
        $actor = auth()->user();

        $action($event, $media, $actor);

        return back(303);
    }
}
