<?php

namespace App\Shell\Support;

use Illuminate\Support\Facades\DB;

/**
 * The stored on/off rows, read once and held for the request or job. Bound as scoped so a
 * long-running queue worker sees a change made in the admin area.
 */
class RoomSwitches
{
    /** @var array<string, bool>|null */
    private ?array $rows = null;

    public function get(string $key): ?bool
    {
        $this->rows ??= DB::table('room_settings')
            ->pluck('enabled', 'key')
            ->map(fn (mixed $enabled): bool => (bool) $enabled)
            ->all();

        return $this->rows[$key] ?? null;
    }

    public function put(string $key, bool $enabled): void
    {
        DB::table('room_settings')->upsert(
            [['key' => $key, 'enabled' => $enabled, 'created_at' => now(), 'updated_at' => now()]],
            ['key'],
            ['enabled', 'updated_at'],
        );

        $this->rows = null;
    }
}
