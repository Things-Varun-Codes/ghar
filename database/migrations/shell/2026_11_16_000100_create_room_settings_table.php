<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * A room with no row is off. An install that already has people was running every room before
 * rooms became a choice, so it keeps them all; a fresh install has no users yet and starts empty.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('room_settings', function (Blueprint $table) {
            // A room's slug, or "{slug}:{option}" for one of its options.
            $table->string('key')->primary();
            $table->boolean('enabled');
            $table->timestamps();
        });

        if (! DB::table('users')->exists()) {
            return;
        }

        $now = now();

        DB::table('room_settings')->insert(
            collect(config('miniapps', []))
                ->pluck('slug')
                ->filter()
                ->map(fn (string $slug): array => [
                    'key' => $slug,
                    'enabled' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ])
                ->values()
                ->all(),
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('room_settings');
    }
};
