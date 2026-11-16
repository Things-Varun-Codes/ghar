<?php

namespace App\MiniApps\Corner\Support;

use App\MiniApps\Corner\Models\Item;
use App\MiniApps\Corner\Services\MoviePosterResolver;
use App\MiniApps\Corner\Services\OEmbedFetcher;

/**
 * Turns what was typed into the columns an item stores, looking up the artwork a link or a
 * Plex share points at.
 */
class ItemDetails
{
    public const DUPLICATE_LINK = 'That link is already in this list.';

    public function __construct(
        private readonly OEmbedFetcher $oembed,
        private readonly MoviePosterResolver $posterResolver,
    ) {}

    /**
     * An edit that keeps the same link keeps what was looked up before instead of asking the
     * provider again.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function for(ListKind $kind, array $data, ?Item $existing = null): array
    {
        $notes = self::text($data['notes'] ?? null);
        $url = self::text($data['url'] ?? null);
        $sameUrl = $existing !== null && $existing->url === $url;

        return ['notes' => $notes] + match ($kind) {
            ListKind::Link => $sameUrl
                ? ['title' => self::text($data['title'] ?? null) ?? $existing->title]
                : $this->link((string) $url, self::text($data['title'] ?? null)),
            ListKind::Poster => [
                'title' => $data['title'],
                'url' => $url,
                'image_url' => $sameUrl ? $existing->image_url : ($this->posterResolver)($url),
            ],
            ListKind::Place => [
                'title' => $data['title'],
                'place_id' => $data['place_id'] ?? null,
                'lat' => $data['lat'] ?? null,
                'lng' => $data['lng'] ?? null,
                'address' => $data['address'] ?? null,
            ],
            ListKind::Plain => ['title' => $data['title']],
        };
    }

    /** @return array<string, mixed> */
    private function link(string $url, ?string $typedTitle): array
    {
        $meta = $this->oembed->fetch($url);

        return [
            'url' => $url,
            // A typed title wins; a link nobody could look up is at least itself.
            'title' => $typedTitle ?? $meta['title'] ?? $url,
            'author' => $meta['author'] ?? null,
            'image_url' => $meta['thumbnail_url'] ?? null,
            'provider' => $meta['provider'] ?? 'unknown',
            // The unique index needs something stable for a link with no provider id.
            'provider_id' => $meta['provider_id'] ?? hash('xxh64', $url),
        ];
    }

    private static function text(mixed $value): ?string
    {
        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }
}
