<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * One row per household day whose morning digest has gone out. The command inserts the row
 * before it sends, and the unique day keeps a rerun or a second server from sending twice.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('our_history_digest_claims', function (Blueprint $table) {
            $table->id();
            $table->date('day')->unique();
            $table->timestamp('claimed_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('our_history_digest_claims');
    }
};
