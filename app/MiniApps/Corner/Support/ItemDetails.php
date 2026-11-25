<?php

namespace App\MiniApps\Corner\Support;

use App\MiniApps\Corner\Models\Item;
use App\MiniApps\Corner\Services\LinkPreview;

/**
 * Turns what was typed into the columns an item stores. A new or changed link is read for a
 * name, a picture, who made it and the site it is on; anything typed wins over what was read.
 */
class ItemDetails
{
    public const DUPLICATE_LINK = 'That link is already in this list.';

    public function __construct(
        private readonly LinkPreview $preview,
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

        return $this->link($data, $existing, $url, $read)
            + ['notes' => ItemRules::trimmed($data['notes'] ?? null)];
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  array{title: ?string, image_url: ?string, author: ?string, site_name: ?string}|null  $read
     * @return array<string, mixed>
     */
    private function link(array $data, ?Item $existing, ?string $url, ?array $read): array
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

        return [
            ...LinkKey::columnsFor($url),
            // An unchanged link keeps its key: a twin the upgrade left keyless must stay editable.
            ...($unchanged ? ['url_key' => $existing?->url_key] : []),
            'author' => $read['author'],
            'site_name' => $read['site_name'],
            // A link nobody could read is at least itself.
            'title' => $typedTitle ?? $read['title'] ?? ($unchanged ? $existing?->title : null) ?? $url,
            'image_url' => $noPicture ? null : ($typedPicture ?? $read['image_url']),
        ];
    }
}
