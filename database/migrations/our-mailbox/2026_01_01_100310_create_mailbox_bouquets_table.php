<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Our Mailbox flowers. Recipients and their read state live in a pivot table.
 * Deleting a user who sent mail is refused (RESTRICT): the mail is shared
 * history, not a detail that can quietly disappear.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mailbox_bouquets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sender_id')->constrained('users')->restrictOnDelete();
            $table->text('note')->nullable();
            // Object key of the generated image in the media bucket.
            $table->string('image_key');
            $table->json('flowers');
            $table->timestamp('posted_at');
            $table->timestamps();

            $table->index(['sender_id', 'posted_at'], 'idx_bq_sender_timeline');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mailbox_bouquets');
    }
};
