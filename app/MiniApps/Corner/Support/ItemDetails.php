<?php

namespace App\MiniApps\Corner\Support;

use App\MiniApps\Corner\Models\Item;
use App\MiniApps\Corner\Services\LinkPreview;
use App\Shell\Support\Http\SafeFetcher;

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
        $url = ItemRules::trimmed($data['url'] ?? null);
        $unchanged = $existing !== null && $existing->url === $url;
        $read = $url === null || $unchanged ? null : $this->preview->lookup($url);
        $place = $url === null || $read === null ? null : MapLink::fromPreview($url, $read);

        return $this->link($data, $existing, $url, $read, $place)
            + $this->location($data, $existing, $url, $read, $place)
            + ['notes' => ItemRules::trimmed($data['notes'] ?? null)];
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  array{title: ?string, image_url: ?string, author: ?string, site_name: ?string, url: string}|null  $read
     * @param  array{label: ?string, lat: ?float, lng: ?float, name: ?string, address: ?string}|null  $place
     * @return array<string, mixed>
     */
    private function link(array $data, ?Item $existing, ?string $url, ?array $read, ?array $place): array
    {
        $typedTitle = ItemRules::trimmed($data['title'] ?? null);
        $typedPicture = ItemRules::trimmed($data['image_url'] ?? null);
        $noPicture = (bool) ($data['no_picture'] ?? false);

        if ($url === null) {
            return [
                'url' => null, 'url_key' => null, 'author' => null, 'site_name' => null,
                'title' => $typedTitle ?? $existing->title ?? '',
                'image_url' => $noPicture ? null : $typedPicture,
            ];
        }

        $unchanged = $read === null;
        $read ??= ['title' => null, 'image_url' => $existing?->image_url, 'author' => $existing?->author, 'site_name' => $existing?->site_name];
        if ($place !== null) {
            $read['title'] = $place['name'];
        }

        return [
            ...LinkKey::columnsFor($url),
            'author' => $read['author'],
            'site_name' => $read['site_name'],
            // A link nobody could read is at least itself.
            'title' => $typedTitle ?? $read['title'] ?? ($unchanged ? $existing?->title : null) ?? $url,
            'image_url' => $noPicture ? null : ($typedPicture ?? $read['image_url']),
        ];
    }

    /**
     * The sheet has one field for links, so a map link there is also where the item is. An
     * explicit `location` still says where on its own.
     *
     * @param  array<string, mixed>  $data
     * @param  array{title: ?string, image_url: ?string, author: ?string, site_name: ?string, url: string}|null  $read
     * @param  array{label: ?string, lat: ?float, lng: ?float, name: ?string, address: ?string}|null  $place
     * @return array<string, mixed>
     */
    private function location(array $data, ?Item $existing, ?string $url, ?array $read, ?array $place): array
    {
        $address = ItemRules::trimmed($data['address'] ?? null);

        if (array_key_exists('location', $data)) {
            return $this->typedLocation(ItemRules::trimmed($data['location']), $address, $existing);
        }

        if ($place !== null) {
            return [
                'location_label' => $place['label'] ?? $place['name'],
                'location_url' => $url,
                'lat' => $place['lat'],
                'lng' => $place['lng'],
                'address' => $address ?? $place['address'],
            ];
        }

        // Only a place that came from the old link goes with it; one set any other way stays.
        $leftWithOldLink = $existing?->url !== null && $existing->url !== $url && $existing->location_url === $existing->url;
        if ($existing !== null && ! $leftWithOldLink) {
            return $this->keptPlace($existing, array_key_exists('address', $data) ? $address : $existing->address);
        }

        return $this->noPlace($address);
    }

    /** @return array<string, mixed> */
    private function typedLocation(?string $input, ?string $address, ?Item $existing): array
    {
        if ($input === null) {
            return $this->noPlace($address);
        }

        // Re-saving the same place keeps what was read from it before, coordinates included.
        $current = $existing->location_url ?? $existing?->location_label;
        if ($existing !== null && $input === $current) {
            return $this->keptPlace($existing, $address);
        }

        $read = MapLink::read($input, $this->fetcher);

        return [
            'location_label' => $read['label'],
            'location_url' => $read['url'],
            'lat' => $read['lat'],
            'lng' => $read['lng'],
            'address' => $address,
        ];
    }

    /** @return array<string, mixed> */
    private function keptPlace(Item $existing, ?string $address): array
    {
        return [
            'location_label' => $existing->location_label,
            'location_url' => $existing->location_url,
            'lat' => $existing->lat,
            'lng' => $existing->lng,
            'address' => $address,
        ];
    }

    /** @return array<string, mixed> */
    private function noPlace(?string $address): array
    {
        return ['location_label' => null, 'location_url' => null, 'lat' => null, 'lng' => null, 'address' => $address];
    }
}
