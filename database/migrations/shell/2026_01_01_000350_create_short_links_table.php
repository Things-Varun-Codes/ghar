<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Auth-gated short links (/go/{code}) written to NFC tags.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('short_links', function (Blueprint $table) {
            $table->id();
            // Immutable once written to a physical tag; see ShortLink::generateCode().
            $table->string('code', 12)->unique();
            $table->string('label', 80);
            $table->text('destination');
            // Kill switch: a disabled code 404s exactly like a missing one.
            $table->boolean('enabled')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('short_links');
    }
};
