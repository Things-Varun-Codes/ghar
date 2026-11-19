<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * The room's address moved from /apps/our-corner to /apps/our-shelf with no redirect, so what was saved under
 * the old slug moves with it: its on/off switch and options in room_settings, and short links
 * that point into the room.
 */
return new class extends Migration
{
    public function up(): void
    {
        $this->move('our-corner', 'our-shelf');
    }

    public function down(): void
    {
        $this->move('our-shelf', 'our-corner');
    }

    private function move(string $from, string $to): void
    {
        DB::update(
            'update room_settings set key = ? || substr(key, ?) where key = ? or key like ?',
            [$to, strlen($from) + 1, $from, $from.':%'],
        );

        DB::update(
            "update short_links set destination = regexp_replace(destination, ?, ?, 'g') where destination like ?",
            ['/apps/'.$from.'([/?#]|$)', '/apps/'.$to.'\\1', '%/apps/'.$from.'%'],
        );
    }
};
