<?php

namespace App\MiniApps\History\Actions;

use App\MiniApps\History\Models\Event;
use App\Shell\Models\User;
use Illuminate\Support\Facades\DB;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

/**
 * Medialibrary's observer deletes the stored file as soon as the Media row goes; there is no
 * undo.
 */
class DetachMedia
{
    public function __construct(
        private readonly LogEventChange $logEventChange,
    ) {}

    public function __invoke(Event $event, Media $media, User $actor): void
    {
        DB::transaction(function () use ($event, $media, $actor): void {
            if ($media->collection_name === 'videos') {
                Media::where('model_type', Event::class)
                    ->where('model_id', $event->id)
                    ->where('collection_name', 'video-posters')
                    ->where('custom_properties->for_media_id', $media->id)
                    ->get()
                    ->each(fn (Media $poster) => $poster->delete());
            }

            $media->delete();

            ($this->logEventChange)($event, 'edit', [
                'user_id' => $actor->id,
                'summary' => 'Removed 1 media',
                'changes' => null,
                'created_at' => now(),
            ]);
        });
    }
}
