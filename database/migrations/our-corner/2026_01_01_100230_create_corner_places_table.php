<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * An Our Corner list. Deleting a user who added items is refused (RESTRICT):
 * authorship is part of the shared history. "Done by" only degrades to null.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('corner_places', function (Blueprint $table) {
            $table->id();
            $table->foreignId('added_by_user_id')->constrained('users')->restrictOnDelete();
            $table->timestamp('added_at')->index();
            $table->timestamp('done_at')->nullable()->index();
            $table->foreignId('done_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            // Set when the place was picked from Google's search; typed-in places have none.
            $table->string('place_id')->nullable();
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->string('address', 1024)->nullable();
            $table->timestamps();

            $table->index(['lat', 'lng'], 'idx_corner_places_latlng');
            $table->index('place_id', 'idx_corner_places_place_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('corner_places');
    }
};
