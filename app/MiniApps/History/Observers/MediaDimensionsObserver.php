<?php

namespace App\MiniApps\History\Observers;

use Spatie\Image\Image;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

/**
 * PhotoSwipe needs width and height. Fills them for media attached outside AttachMedia.
 */
class MediaDimensionsObserver
{
    public function created(Media $media): void
    {
        // This observer is global on Spatie's Media model, which has no per-model filter.
        if (! in_array($media->collection_name, ['photos', 'videos', 'video-posters'], true)) {
            return;
        }

        if ($media->mime_type === null || ! str_starts_with($media->mime_type, 'image/')) {
            return;
        }

        $props = $media->custom_properties ?? [];
        if (isset($props['width']) && isset($props['height'])) {
            return;
        }

        // getPath() on a bucket isn't a filesystem path, so Image::load() would throw.
        if ($media->disk !== 'local') {
            return;
        }

        try {
            $image = Image::load($media->getPath());
            $w = $image->getWidth();
            $h = $image->getHeight();

            $media->custom_properties = array_merge($props, ['width' => $w, 'height' => $h]);
            $media->saveQuietly();
        } catch (\Throwable $e) {
            // An observer that throws rolls back the Media write and corrupts the upload.
            // Missing dimensions only affect the lightbox.
            report($e);
        }
    }
}
