<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** A person's own postcard prompts. They go with the person: nobody else ever sees them. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mailbox_saved_prompts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('name');
            $table->text('prompt');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mailbox_saved_prompts');
    }
};
