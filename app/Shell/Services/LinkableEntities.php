<?php

namespace App\Shell\Services;

use Closure;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class LinkableEntities
{
    /** @var array<string, array{listing: Closure, resolve: Closure, resolveMany: ?Closure}> */
    private array $registry = [];

    public function register(string $type, Closure $listing, Closure $resolve, ?Closure $resolveMany = null): void
    {
        $this->registry[$type] = [
            'listing' => $listing,
            'resolve' => $resolve,
            'resolveMany' => $resolveMany,
        ];
    }

    /** @return list<array{type: string, id: int, title: string, thumbnail_url?: ?string}> */
    public function search(string $query, array $types = [], int $limit = 20): array
    {
        $types = empty($types) ? array_keys($this->registry) : $types;
        $results = [];

        foreach ($types as $type) {
            if (! isset($this->registry[$type])) {
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
            ->get();

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

    /** @return list<string> */
    public function registeredTypes(): array
    {
        return array_keys($this->registry);
    }
}
