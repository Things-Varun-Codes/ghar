<?php

namespace App\Shell\Support;

use Illuminate\Support\Facades\Storage;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class SignedUrls
{
    private const TTL_MINUTES = 60;

    /**
     * @return array{
     *     id: int,
     *     kind: 'photo'|'video',
     *     thumb: string|null,
     *     medium: string|null,
     *     original: string,
     *     poster: string|null,
     *     pending: bool,
     *     width: int|null,
     *     height: int|null,
     *     mime_type: string|null,
     *     alt: string,
     * }
     */
    public function forMedia(Media $media, ?Media $poster = null): array
    {
        $expiry = now()->addMinutes(self::TTL_MINUTES);

        // collection_name, not mime_type: UploadedFile::fake() reports application/x-empty.
        $isPhoto = $media->collection_name === 'photos';
        $isVideo = $media->collection_name === 'videos';

        $thumb = null;
        if ($isPhoto && $media->hasGeneratedConversion('thumb')) {
            $thumb = $this->urlFor($media, $expiry, 'thumb');
        }

        $medium = null;
        if ($isPhoto && $media->hasGeneratedConversion('medium')) {
            $medium = $this->urlFor($media, $expiry, 'medium');
        }

        $original = $this->urlFor($media, $expiry);

        $posterUrl = null;
        if ($poster !== null) {
            $posterUrl = $poster->hasGeneratedConversion('medium')
                ? $this->urlFor($poster, $expiry, 'medium')
                : $this->urlFor($poster, $expiry);
        }

        // Conversions are queued, so thumb and medium may not exist right after upload.
        // `pending` lets the client show a placeholder instead of the full-size original.
        $pending = $isPhoto && ($thumb === null || $medium === null);

        return [
            'id' => $media->id,
            'kind' => $isVideo ? 'video' : 'photo',
            'thumb' => $thumb,
            'medium' => $medium,
            'original' => $original,
            'poster' => $posterUrl,
            'pending' => $pending,
            'width' => $media->custom_properties['width'] ?? null,
            'height' => $media->custom_properties['height'] ?? null,
            'mime_type' => $media->mime_type,
            'alt' => $media->custom_properties['alt'] ?? '',
        ];
    }

    public function forDiskObject(string $disk, string $key, ?int $ttlMinutes = null): string
    {
        $expiry = now()->addMinutes($ttlMinutes ?? self::TTL_MINUTES);

        return Storage::disk($disk)->temporaryUrl($key, $expiry);
    }

    private function urlFor(Media $media, $expiry, string $conversion = ''): string
    {
        return $media->getTemporaryUrl($expiry, $conversion);
    }
}
