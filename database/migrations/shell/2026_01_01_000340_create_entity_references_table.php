<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Polymorphic cross-links between entities of any mini app. Deliberately no
 * foreign keys: the ends live in tables owned by different apps, and an app
 * can be disabled without breaking this table. A link whose target is gone
 * resolves to null.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('entity_references', function (Blueprint $table) {
            $table->id();
            // Type keys registered with LinkableEntities, e.g. "history.event".
            $table->string('from_type', 64);
            $table->unsignedBigInteger('from_id');
            $table->string('to_type', 64);
            $table->unsignedBigInteger('to_id');
            $table->timestamp('created_at')->useCurrent();

            $table->unique(['from_type', 'from_id', 'to_type', 'to_id'], 'unq_entity_ref');
            // "What links here" on the target's page.
            $table->index(['to_type', 'to_id'], 'idx_backref');
            // Diffing a source's links when it is saved.
            $table->index(['from_type', 'from_id'], 'idx_diffref');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('entity_references');
    }
};
