<?php

namespace App\MiniApps\Corner\Support;

use App\MiniApps\Corner\Models\Item;
use App\Shell\Services\LinkableEntities;
use App\Shell\Support\CursorList;
use Illuminate\Support\Collection;

/**
 * How History (through the shell's LinkableEntities) finds Corner items without importing
 * Corner.
 *
 * New links use the type corner.item. Links written before lists were customisable say
 * corner.song, corner.movie, corner.activity or corner.place with the item's old id. Those
 * four stay registered so History keeps them when a moment is saved again; they only
 * resolve, and never show up in the picker.
 */
final class CornerLinks
{
    public const TYPE = 'corner.item';

    public const LEGACY_TYPES = ['corner.song', 'corner.movie', 'corner.activity', 'corner.place'];

    private const PICKER_LIMIT = 20;

    public static function register(LinkableEntities $linkable): void
    {
        $linkable->register(
            self::TYPE,
            listing: fn (string $q, int $limit): array => self::search($q, $limit),
            resolve: fn (int $id): ?array => self::resolveMany([$id], 'id')[$id] ?? null,
            resolveMany: fn (array $ids): array => self::resolveMany($ids, 'id'),
        );

        foreach (self::LEGACY_TYPES as $type) {
            $linkable->register(
                $type,
                listing: fn (): array => [],
                resolve: fn (int $id): ?array => self::resolveMany([$id], 'legacy_id', $type)[$id] ?? null,
                resolveMany: fn (array $ids): array => self::resolveMany($ids, 'legacy_id', $type),
            );
        }
    }

    /**
     * Where an item is mentioned, by its own id and, for a moved item, by its old one.
     *
     * @return Collection<int, array{from_type: string, from_id: int, snapshot: array<string, mixed>|null}>
     */
    public static function mentionsOf(Item $item, LinkableEntities $linkable): Collection
    {
        $mentions = $linkable->referencesTo(self::TYPE, $item->id);

        if ($item->legacy_type !== null && $item->legacy_id !== null) {
            $mentions = $mentions->concat($linkable->referencesTo($item->legacy_type, $item->legacy_id));
        }

        return $mentions
            ->unique(fn (array $m): string => "{$m['from_type']}:{$m['from_id']}")
            ->values();
    }

    public static function urlFor(string $slug, int $id): string
    {
        return route('apps.our-corner.items.show', [$slug, $id]);
    }

    /** @return list<array{id: int, title: string, group: string, thumbnail_url: ?string, deep_link_url: string}> */
    private static function search(string $q, int $limit): array
    {
        return Item::query()
            ->with('list:id,slug,name')
            ->where('title', 'ilike', CursorList::containsPattern($q))
            ->orderByDesc('added_at')
            ->orderByDesc('id')
            ->limit(min($limit, self::PICKER_LIMIT))
            ->get()
            ->map(fn (Item $item): array => [
                'id' => $item->id,
                'title' => $item->title,
                'group' => $item->list->name,
                'thumbnail_url' => $item->image_url,
                'deep_link_url' => self::urlFor($item->list->slug, $item->id),
            ])
            ->all();
    }

    /**
     * @param  array<int, int>  $ids
     * @return array<int, array{title: string, thumbnail_url: ?string, deep_link_url: string}>
     */
    private static function resolveMany(array $ids, string $column, ?string $legacyType = null): array
    {
        if ($ids === []) {
            return [];
        }

        return Item::query()
            ->with('list:id,slug')
            ->whereIn($column, $ids)
            ->when($legacyType !== null, fn ($query) => $query->where('legacy_type', $legacyType))
            ->get()
            ->mapWithKeys(fn (Item $item): array => [
                (int) $item->{$column} => [
                    'title' => $item->title,
                    'thumbnail_url' => $item->image_url,
                    'deep_link_url' => self::urlFor($item->list->slug, $item->id),
                ],
            ])
            ->all();
    }
}
