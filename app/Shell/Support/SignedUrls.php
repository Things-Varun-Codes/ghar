<?php

namespace App\Shell\Support;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Storage;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class SignedUrls
{
    private const TTL_MINUTES = 60;

    /**
     * How long a browser may reuse a file it fetched through a signed URL. No longer than
     * TTL_MINUTES, the least time a freshly issued URL still has to live.
     */
    private const BROWSER_CACHE_SECONDS = 3600;

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
        $window = $this->window(self::TTL_MINUTES);

        // collection_name, not mime_type: UploadedFile::fake() reports application/x-empty.
        $isPhoto = $media->collection_name === 'photos';
        $isVideo = $media->collection_name === 'videos';

        $thumb = null;
        if ($isPhoto && $media->hasGeneratedConversion('thumb')) {
            $thumb = $this->urlFor($media, $window, 'thumb');
        }

        $medium = null;
        if ($isPhoto && $media->hasGeneratedConversion('medium')) {
            $medium = $this->urlFor($media, $window, 'medium');
        }

        $original = $this->urlFor($media, $window);

        $posterUrl = null;
        if ($poster !== null) {
            $posterUrl = $poster->hasGeneratedConversion('medium')
                ? $this->urlFor($poster, $window, 'medium')
                : $this->urlFor($poster, $window);
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
        $window = $this->window($ttlMinutes ?? self::TTL_MINUTES);

        return Storage::disk($disk)->temporaryUrl($key, $window['expires'], $this->options($window));
    }

    /** @param  array{starts: CarbonImmutable, expires: CarbonImmutable}  $window */
    private function urlFor(Media $media, array $window, string $conversion = ''): string
    {
        return $media->getTemporaryUrl($window['expires'], $conversion, $this->options($window));
    }

    /**
     * A signature covers its start and expiry times, so signing from "now" gives every page
     * view a new URL for the same file and the browser downloads it again each time. Signing
     * from the top of a fixed window keeps the URL identical for the whole window. A URL
     * therefore lives between one and two TTLs, never less than the TTL.
     *
     * @return array{starts: CarbonImmutable, expires: CarbonImmutable}
     */
    private function window(int $ttlMinutes): array
    {
        $seconds = max(1, $ttlMinutes) * 60;
        $starts = CarbonImmutable::createFromTimestamp(intdiv(now()->getTimestamp(), $seconds) * $seconds);

        return ['starts' => $starts, 'expires' => $starts->addSeconds($seconds * 2)];
    }

    /**
     * `start_time` pins the S3 signature date to the window; `ResponseCacheControl` is signed
     * into the URL and makes the bucket answer with that header. The local disk ignores both:
     * its URL depends only on the expiry.
     *
     * @param  array{starts: CarbonImmutable, expires: CarbonImmutable}  $window
     * @return array<string, mixed>
     */
    private function options(array $window): array
    {
        return [
            'start_time' => $window['starts'],
            'ResponseCacheControl' => 'private, max-age='.self::BROWSER_CACHE_SECONDS.', immutable',
        ];
    }
}
