<?php

namespace App\MiniApps\Corner\Support;

use App\MiniApps\Corner\Models\Item;
use App\MiniApps\Corner\Services\LinkPreview;
use App\MiniApps\Corner\Services\SafeFetcher;

/**
 * Turns what was typed into the columns an item stores. A new or changed link is read for a
 * name, a picture, who made it and the site it is on; anything typed wins over what was read.
 */
class ItemDetails
{
    public const DUPLICATE_LINK = 'That link is already in this list.';

    public function __construct(
        private readonly LinkPreview $preview,
        private readonly SafeFetcher $fetcher,
    ) {}

    /**
     * @param  array<string, mixed>  $data  validated by ItemRules
     * @return array<string, mixed>
     */
    public function for(array $data, ?Item $existing = null): array
    {
        return $this->link($data, $existing) + $this->location($data, $existing) + [
            'notes' => self::text($data['notes'] ?? null),
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function link(array $data, ?Item $existing): array
    {
        $url = self::text($data['url'] ?? null);
        $typedTitle = self::text($data['title'] ?? null);
        $typedPicture = self::text($data['image_url'] ?? null);
        $noPicture = (bool) ($data['no_picture'] ?? false);

        if ($url === null) {
            return [
                'url' => null, 'url_key' => null, 'author' => null, 'site_name' => null,
                'title' => $typedTitle ?? $existing->title ?? '',
                'image_url' => $noPicture ? null : $typedPicture,
            ];
        }

        $unchanged = $existing !== null && $existing->url === $url;
        $read = $unchanged
            ? ['title' => null, 'image_url' => $existing->image_url, 'author' => $existing->author, 'site_name' => $existing->site_name]
            : $this->preview->lookup($url);

        return [
            'url' => $url,
            'url_key' => LinkKey::for($url),
            'author' => $read['author'],
            'site_name' => $read['site_name'],
            // A link nobody could read is at least itself.
            'title' => $typedTitle ?? $read['title'] ?? ($unchanged ? $existing->title : null) ?? $url,
            'image_url' => $noPicture ? null : ($typedPicture ?? $read['image_url']),
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function location(array $data, ?Item $existing): array
    {
        $input = self::text($data['location'] ?? null);
        $address = self::text($data['address'] ?? null);

        if ($input === null) {
            return [
                'location_label' => null, 'location_url' => null, 'place_id' => null,
                'lat' => null, 'lng' => null, 'address' => $address,
            ];
        }

        // Re-saving the same place keeps what was read from it before, coordinates included.
        $current = $existing->location_url ?? $existing?->location_label;
        if ($existing !== null && $input === $current) {
            return [
                'location_label' => $existing->location_label,
                'location_url' => $existing->location_url,
                'place_id' => $existing->place_id,
                'lat' => $existing->lat,
                'lng' => $existing->lng,
                'address' => $address,
            ];
        }

        $read = MapLink::read($input, $this->fetcher);
        $sentPoint = isset($data['lat'], $data['lng']);

        return [
            'location_label' => $read['label'],
            'location_url' => $read['url'],
            'place_id' => null,
            'lat' => $read['lat'] ?? ($sentPoint ? (float) $data['lat'] : null),
            'lng' => $read['lng'] ?? ($sentPoint ? (float) $data['lng'] : null),
            'address' => $address,
        ];
    }

    private static function text(mixed $value): ?string
    {
        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }
}
