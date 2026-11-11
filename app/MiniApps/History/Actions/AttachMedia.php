<?php

namespace App\MiniApps\History\Actions;

use App\MiniApps\History\Models\Event;
use App\Shell\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Spatie\Image\Image;

class AttachMedia
{
    public function __construct(
        private readonly LogEventChange $logEventChange,
    ) {}

    public function photo(Event $event, UploadedFile $photo, User $actor): void
    {
        // Image::load() needs a local path, so read the dimensions before the file moves to
        // the media disk.
        $customProperties = [];
        try {
            $image = Image::load($photo->getRealPath());
            $customProperties = [
                'width' => $image->getWidth(),
                'height' => $image->getHeight(),
            ];
        } catch (\Throwable $e) {
            // A corrupt or unsupported file still attaches; PhotoSwipe falls back to
            // auto-sizing.
            report($e);
        }

        DB::transaction(function () use ($event, $photo, $actor, $customProperties): void {
            $adder = $event->addMedia($photo);
            if (! empty($customProperties)) {
                $adder = $adder->withCustomProperties($customProperties);
            }
            $adder->toMediaCollection('photos');

            ($this->logEventChange)($event, 'edit', [
                'user_id' => $actor->id,
                'summary' => 'Added 1 photo',
                'changes' => null,
                'created_at' => now(),
            ]);
        });
    }

    public function video(Event $event, UploadedFile $video, ?UploadedFile $poster, User $actor): void
    {
        DB::transaction(function () use ($event, $video, $poster, $actor): void {
            $videoMedia = $event->addMedia($video)
                ->toMediaCollection('videos');

            if ($poster) {
                $event->addMedia($poster)
                    ->withCustomProperties(['for_media_id' => $videoMedia->id])
                    ->toMediaCollection('video-posters');
            }

            ($this->logEventChange)($event, 'edit', [
                'user_id' => $actor->id,
                'summary' => 'Added 1 video',
                'changes' => null,
                'created_at' => now(),
            ]);
        });
    }
}
