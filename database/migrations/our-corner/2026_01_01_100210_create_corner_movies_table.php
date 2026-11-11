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
        Schema::create('corner_movies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('added_by_user_id')->constrained('users')->restrictOnDelete();
            $table->timestamp('added_at')->index();
            $table->timestamp('done_at')->nullable()->index();
            $table->foreignId('done_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->string('poster_url', 2048)->nullable();
            $table->string('plex_url', 2048)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('corner_movies');
    }
};
