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

    /** The Cache-Control a file fetched through a signed URL is served with, on any disk. */
    public const CACHE_CONTROL = 'private, max-age='.self::BROWSER_CACHE_SECONDS.', immutable';

    /**
     * @return array{
     *     id: int,
     *     kind: 'photo'|'video',
     *     card: string|null,
     *     thumb: string|null,
     *     medium: string|null,
     *     large: string|null,
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

        $sized = [];
        foreach (['card', 'thumb', 'medium', 'large'] as $conversion) {
            $sized[$conversion] = $isPhoto && $media->hasGeneratedConversion($conversion)
                ? $this->urlFor($media, $window, $conversion)
                : null;
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
        // card and large are left out: photos from before they existed lack them until
        // regenerated, and every reader falls back to thumb or medium.
        $pending = $isPhoto && ($sized['thumb'] === null || $sized['medium'] === null);

        return [
            'id' => $media->id,
            'kind' => $isVideo ? 'video' : 'photo',
            'card' => $sized['card'],
            'thumb' => $sized['thumb'],
            'medium' => $sized['medium'],
            'large' => $sized['large'],
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
            'ResponseCacheControl' => self::CACHE_CONTROL,
        ];
    }
}
