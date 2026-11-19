<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('our_history_event_reactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained('our_history_events')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            // A key from EventReaction::EMOJI, not the glyph, so a glyph can change without a
            // data migration.
            $table->string('reaction', 16);
            $table->timestamp('created_at')->useCurrent();

            // Also the index the moment's reactions are read through.
            $table->unique(['event_id', 'user_id', 'reaction']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('our_history_event_reactions');
    }
};
