<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('our_history_events', function (Blueprint $table) {
            $table->id();
            $table->date('occurred_on')->index();
            $table->string('title')->nullable();
            $table->string('location_freetext')->nullable();
            // Sanitised HTML from the TipTap editor (see SanitizeBodyHtml).
            $table->longText('body_html')->nullable();
            $table->foreignId('creator_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
            $table->string('location_place_id')->nullable()->index();
            $table->string('location_name')->nullable();
            $table->string('location_address')->nullable();
            $table->decimal('location_lat', 10, 7)->nullable();
            $table->decimal('location_lng', 10, 7)->nullable();

            // Timeline order: newest day first, then insertion order within a day.
            $table->index(['occurred_on', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('our_history_events');
    }
};
