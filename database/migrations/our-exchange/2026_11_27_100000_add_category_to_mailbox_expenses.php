<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** What an expense was for: an ExpenseCategory key. Null has none, and reads as the receipt. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mailbox_expenses', function (Blueprint $table) {
            $table->string('category', 32)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('mailbox_expenses', function (Blueprint $table) {
            $table->dropColumn('category');
        });
    }
};
