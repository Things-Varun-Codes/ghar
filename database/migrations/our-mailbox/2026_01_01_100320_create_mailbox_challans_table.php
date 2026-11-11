<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Our Mailbox challans (mock traffic tickets). Deleting a user who sent or
 * received mail is refused (RESTRICT): the mail is shared history, not a
 * detail that can quietly disappear.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mailbox_challans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('issuer_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('recipient_id')->constrained('users')->restrictOnDelete();
            // Filled in after insert from the id (OC/{year}/{padded id}).
            $table->string('ref_no')->nullable()->unique();
            $table->string('offence');
            $table->date('incident_date')->nullable();
            $table->string('incident_place')->nullable();
            $table->boolean('is_repeat')->default(false);
            $table->string('penalty', 120)->nullable();
            $table->text('remarks')->nullable();
            $table->string('status')->default('issued');
            $table->timestamp('settled_at')->nullable();
            $table->timestamp('issued_at');
            $table->timestamps();

            $table->index(['recipient_id', 'status']);
            $table->index(['issuer_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mailbox_challans');
    }
};
