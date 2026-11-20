<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A list can let each person mark a thing done for themselves ("Meera loves this song"), instead
 * of one person marking it for everyone. Those marks live here; a shared list keeps using
 * corner_items.done_at and done_by_user_id.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('corner_lists', function (Blueprint $table) {
            $table->boolean('done_per_person')->default(false)->after('notify_on_add');
        });

        Schema::create('corner_item_marks', function (Blueprint $table) {
            $table->foreignId('item_id')->constrained('corner_items')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('done_at');
            $table->primary(['item_id', 'user_id']);
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('corner_item_marks');

        Schema::table('corner_lists', function (Blueprint $table) {
            $table->dropColumn('done_per_person');
        });
    }
};
