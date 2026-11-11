<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Append-only audit log for Our History moments.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('our_history_event_changes', function (Blueprint $table) {
            $table->id();
            // Nullable so the audit trail survives a hard delete of its event.
            $table->foreignId('event_id')->nullable()->constrained('our_history_events')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action');
            $table->text('summary');
            $table->json('changes')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('our_history_event_changes');
    }
};
