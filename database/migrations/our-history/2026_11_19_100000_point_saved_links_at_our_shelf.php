<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * A link pill saves its target in the moment's body_html (data-corner-href). The room behind those
 * links moved from /apps/our-corner to /apps/our-shelf with no redirect, so the saved addresses move.
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
            "update our_history_events set body_html = regexp_replace(body_html, ?, ?, 'g') where body_html like ?",
            ['/apps/'.$from.'([/?#"\']|$)', '/apps/'.$to.'\1', '%/apps/'.$from.'%'],
        );
    }
};
