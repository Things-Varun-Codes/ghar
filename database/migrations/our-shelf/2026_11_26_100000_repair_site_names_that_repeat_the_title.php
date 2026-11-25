<?php

use App\MiniApps\Corner\Support\LinkKey;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Pages that give their "Name · details" title as their site name had it saved as one, so the
 * button read "Open on <the whole title>". They go by the link's host instead.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('corner_items')
            ->whereNotNull('url')
            ->where('site_name', 'like', '% · %')
            ->orderBy('id')
            ->get(['id', 'url'])
            ->each(fn (object $row) => DB::table('corner_items')
                ->where('id', $row->id)
                ->update(['site_name' => LinkKey::siteOf($row->url)]));
    }

    public function down(): void {}
};
