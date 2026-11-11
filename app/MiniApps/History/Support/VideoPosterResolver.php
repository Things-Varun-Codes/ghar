<?php

namespace App\MiniApps\History\Support;

use Illuminate\Support\Collection;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class VideoPosterResolver
{
    /** @param  Collection<int, Media>  $posters */
    public static function forVideo(Media $video, Collection $posters): ?Media
    {
        return $posters->first(
            fn (Media $p) => ($p->custom_properties['for_media_id'] ?? null) === $video->id
        );
    }
}
