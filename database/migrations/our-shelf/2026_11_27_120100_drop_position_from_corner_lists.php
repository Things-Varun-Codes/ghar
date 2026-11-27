<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** The shelf's one shared order: each person now keeps their own (personal_orders). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('corner_lists', function (Blueprint $table) {
            $table->dropColumn('position');
        });
    }

    public function down(): void
    {
        Schema::table('corner_lists', function (Blueprint $table) {
            $table->unsignedInteger('position')->default(0);
        });
    }
};
