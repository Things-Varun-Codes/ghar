<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Each person's own order of a room's things (`scope` says which: Shelf lists, expense groups).
 * No foreign key to the things themselves: the shell can't point into a room's tables, and a
 * row left by something deleted is never read, since orders are only looked up from the things.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('personal_orders', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('scope', 64);
            $table->unsignedBigInteger('item_id');
            $table->unsignedInteger('position');
            $table->primary(['user_id', 'scope', 'item_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('personal_orders');
    }
};
