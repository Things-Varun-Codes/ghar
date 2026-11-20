<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The member whose birthday a moment is, when the household says so.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('our_history_events', function (Blueprint $table) {
            $table->foreignId('birthday_user_id')->nullable()->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('our_history_events', function (Blueprint $table) {
            $table->dropConstrainedForeignId('birthday_user_id');
        });
    }
};
