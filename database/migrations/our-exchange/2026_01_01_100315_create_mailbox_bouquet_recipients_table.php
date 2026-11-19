<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Who a bouquet was sent to, with each recipient's own read state. Deleting the
 * bouquet takes its recipient rows with it; deleting a user who received mail is
 * refused (RESTRICT), as on the bouquet itself.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mailbox_bouquet_recipients', function (Blueprint $table) {
            $table->foreignId('bouquet_id')->constrained('mailbox_bouquets')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->timestamp('read_at')->nullable();

            $table->primary(['bouquet_id', 'user_id']);
            $table->index(['user_id', 'read_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mailbox_bouquet_recipients');
    }
};
