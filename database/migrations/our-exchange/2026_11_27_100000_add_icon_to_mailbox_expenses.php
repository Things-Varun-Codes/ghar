<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** The lucide icon an expense is drawn with. Null reads as the receipt. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mailbox_expenses', function (Blueprint $table) {
            $table->string('icon', 64)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('mailbox_expenses', function (Blueprint $table) {
            $table->dropColumn('icon');
        });
    }
};
