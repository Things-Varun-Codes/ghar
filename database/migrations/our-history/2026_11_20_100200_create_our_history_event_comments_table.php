<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('our_history_event_comments', function (Blueprint $table) {
            $table->id();
            // Cascade: history:prune-media force-deletes moments, and their comments go with them.
            $table->foreignId('event_id')->constrained('our_history_events')->cascadeOnDelete();
            // Kept when the author's account goes; the page names them "Someone".
            $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('body');
            $table->timestamp('created_at')->useCurrent();

            $table->index(['event_id', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('our_history_event_comments');
    }
};
