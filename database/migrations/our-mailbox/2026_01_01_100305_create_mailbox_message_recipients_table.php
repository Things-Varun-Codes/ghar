<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Who a note was sent to, with each recipient's own read state. Deleting the
 * note takes its recipient rows with it; deleting a user who received mail is
 * refused (RESTRICT), as on the note itself.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mailbox_message_recipients', function (Blueprint $table) {
            $table->foreignId('message_id')->constrained('mailbox_messages')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->timestamp('read_at')->nullable();

            $table->primary(['message_id', 'user_id']);
            $table->index(['user_id', 'read_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mailbox_message_recipients');
    }
};
