<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Our Mailbox coupons. Deleting a user who sent or received mail is refused
 * (RESTRICT): the mail is shared history, not a detail that can quietly
 * disappear.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mailbox_coupons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('issuer_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('recipient_id')->constrained('users')->restrictOnDelete();
            $table->string('code')->nullable()->unique();
            $table->string('title');
            $table->text('description')->nullable();
            $table->unsignedInteger('quantity');
            $table->unsignedInteger('redeemed_count')->default(0);
            $table->date('expires_at')->nullable();
            $table->string('status')->default('issued');
            $table->timestamp('requested_at')->nullable();
            $table->timestamp('issued_at');
            $table->timestamp('last_fulfilled_at')->nullable();
            $table->timestamps();

            $table->index(['recipient_id', 'status']);
            $table->index(['issuer_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mailbox_coupons');
    }
};
