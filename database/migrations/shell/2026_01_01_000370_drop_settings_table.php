<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The table only ever held the active theme, and there is one look now. Installs from
 * before that still have it; new ones never create it.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('settings');
    }

    public function down(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->string('value', 1024);
            $table->timestamp('updated_at')->nullable();
        });
    }
};
