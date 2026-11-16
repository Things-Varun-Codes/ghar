<?php

namespace App\Shell\Services;

use Closure;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class LinkableEntities
{
    /** @var array<string, array{listing: Closure, resolve: Closure, resolveMany: ?Closure, room: ?string}> */
    private array $registry = [];

    public function __construct(private readonly Rooms $rooms) {}

    /**
     * Pass `room` (the registry slug) when the type's pages belong to a room: while that room is
     * off the type can't be searched and references from it are left out, so nothing links to a
     * page that answers 404.
     */
    public function register(string $type, Closure $listing, Closure $resolve, ?Closure $resolveMany = null, ?string $room = null): void
    {
        $this->registry[$type] = [
            'room' => $room,
            'listing' => $listing,
            'resolve' => $resolve,
            'resolveMany' => $resolveMany,
        ];
    }

    /** @return list<array{type: string, id: int, title: string, thumbnail_url?: ?string, icon?: string, deep_link_url?: string, group?: string}> */
    public function search(string $query, array $types = [], int $limit = 20): array
    {
        $types = empty($types) ? array_keys($this->registry) : $types;
        $results = [];

        foreach ($types as $type) {
            if (! $this->available($type)) {
                continue;
            }
            $listing = $this->registry[$type]['listing'];
            $items = $listing($query, $limit);
            foreach ($items as $item) {
                $results[] = ['type' => $type] + $item;
                if (count($results) >= $limit) {
                    break 2;
                }
            }
        }

        return $results;
    }

    public function resolve(string $type, int $id): ?array
    {
        if (! isset($this->registry[$type])) {
            return null;
        }

        return ($this->registry[$type]['resolve'])($id);
    }

    /**
     * @param  list<int>  $ids
     * @return array<int, array<string, mixed>|null>
     */
    public function resolveMany(string $type, array $ids): array
    {
        if (! isset($this->registry[$type])) {
            return [];
        }

        $batch = $this->registry[$type]['resolveMany'];

        if ($batch !== null) {
            return $batch($ids);
        }

        $results = [];
        foreach ($ids as $id) {
            $results[$id] = $this->resolve($type, $id);
        }

        return $results;
    }

    /**
     * Idempotent via the unique index: concurrent inserts of one tuple collapse to a single
     * row.
     */
    public function recordReference(string $fromType, int $fromId, string $toType, int $toId): void
    {
        DB::table('entity_references')->updateOrInsert(
            [
                'from_type' => $fromType,
                'from_id' => $fromId,
                'to_type' => $toType,
                'to_id' => $toId,
            ],
            ['created_at' => now()],
        );
    }

    public function removeReference(string $fromType, int $fromId, string $toType, int $toId): void
    {
        DB::table('entity_references')
            ->where('from_type', $fromType)
            ->where('from_id', $fromId)
            ->where('to_type', $toType)
            ->where('to_id', $toId)
            ->delete();
    }

    /**
     * A snapshot may be null when the from-entity was deleted; callers render that as a
     * missing reference.
     *
     * @return Collection<int, array{from_type: string, from_id: int, snapshot: array<string, mixed>|null}>
     */
    public function referencesTo(string $toType, int $toId): Collection
    {
        $rows = DB::table('entity_references')
            ->where('to_type', $toType)
            ->where('to_id', $toId)
            ->orderByDesc('created_at')
            ->get()
            ->reject(fn ($row): bool => $this->roomIsOff((string) $row->from_type))
            ->values();

        /** @var array<string, list<int>> $idsByType */
        $idsByType = [];
        foreach ($rows as $row) {
            $idsByType[(string) $row->from_type][] = (int) $row->from_id;
        }

        /** @var array<string, array<int, array<string, mixed>|null>> $resolvedByType */
        $resolvedByType = [];
        foreach ($idsByType as $type => $ids) {
            $resolvedByType[$type] = $this->resolveMany($type, array_values(array_unique($ids)));
        }

        /**
         * @var Collection<int, array{from_type: string, from_id: int, snapshot: array<string, mixed>|null}> $result
         */
        $result = collect($rows)->map(fn ($row) => [
            'from_type' => (string) $row->from_type,
            'from_id' => (int) $row->from_id,
            'snapshot' => $resolvedByType[(string) $row->from_type][(int) $row->from_id] ?? null,
        ]);

        return $result;
    }

    private function available(string $type): bool
    {
        return isset($this->registry[$type]) && ! $this->roomIsOff($type);
    }

    private function roomIsOff(string $type): bool
    {
        $room = $this->registry[$type]['room'] ?? null;

        return $room !== null && ! $this->rooms->isOn($room);
    }

    /**
     * What a page needs to draw many links at once: each "type:id" resolved to the thing as it
     * is now, one resolveMany per type, however many links there are. A type whose room is off,
     * or that isn't registered, resolves to nothing, as does a thing that no longer exists.
     *
     * @param  iterable<array{0: string, 1: int}>  $refs
     * @return array<string, array<string, mixed>>
     */
    public function snapshotsFor(iterable $refs): array
    {
        $idsByType = [];
        foreach ($refs as [$type, $id]) {
            if ($this->available($type)) {
                $idsByType[$type][$id] = $id;
            }
        }

        $snapshots = [];
        foreach ($idsByType as $type => $ids) {
            foreach ($this->resolveMany($type, array_values($ids)) as $id => $snapshot) {
                if ($snapshot !== null) {
                    $snapshots["{$type}:{$id}"] = $snapshot;
                }
            }
        }

        return $snapshots;
    }

    /**
     * What each of many things links to, as it is now: from id => "type:id" => snapshot. One
     * query for the references and one per linked type, however many things there are.
     *
     * @param  list<int>  $fromIds
     * @return array<int, array<string, array<string, mixed>>>
     */
    public function snapshotsFrom(string $fromType, array $fromIds): array
    {
        if ($fromIds === []) {
            return [];
        }

        $refs = DB::table('entity_references')
            ->where('from_type', $fromType)
            ->whereIn('from_id', $fromIds)
            ->get(['from_id', 'to_type', 'to_id']);

        $snapshots = $this->snapshotsFor(
            $refs->map(fn (object $ref): array => [(string) $ref->to_type, (int) $ref->to_id]),
        );

        $byFrom = [];
        foreach ($refs as $ref) {
            $key = "{$ref->to_type}:{$ref->to_id}";
            if (isset($snapshots[$key])) {
                $byFrom[(int) $ref->from_id][$key] = $snapshots[$key];
            }
        }

        return $byFrom;
    }

    /** @return list<string> */
    public function registeredTypes(): array
    {
        return array_keys($this->registry);
    }
}
