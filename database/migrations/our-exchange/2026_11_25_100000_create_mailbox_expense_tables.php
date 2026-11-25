<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Shared expenses. Amounts are whole minor units (paise, cents) in the household's one currency.
 * Balances are never stored: they are summed from the expenses and their shares. Deleting a user
 * who is on an expense is refused (RESTRICT), like the rest of the Exchange.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mailbox_expense_groups', function (Blueprint $table) {
            $table->id();
            $table->string('name', 60);
            // The built-in group everyone is in: it has no member rows.
            $table->boolean('is_general')->default(false);
            $table->foreignId('created_by_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();
        });

        DB::statement('create unique index mailbox_expense_groups_one_general on mailbox_expense_groups (is_general) where is_general');

        Schema::create('mailbox_expense_group_members', function (Blueprint $table) {
            $table->foreignId('group_id')->constrained('mailbox_expense_groups')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->primary(['group_id', 'user_id']);
        });

        Schema::create('mailbox_expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('group_id')->constrained('mailbox_expense_groups')->restrictOnDelete();
            $table->foreignId('paid_by_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('created_by_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('updated_by_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->string('title', 120);
            $table->bigInteger('amount');
            $table->date('spent_on');
            $table->string('split_mode', 10);
            // A repayment: paid_by is who paid, and its one share is who received it.
            $table->boolean('is_settlement')->default(false);
            $table->timestamp('deleted_at')->nullable();
            $table->foreignId('deleted_by_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->index(['group_id', 'spent_on', 'id']);
        });

        Schema::create('mailbox_expense_shares', function (Blueprint $table) {
            $table->foreignId('expense_id')->constrained('mailbox_expenses')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->bigInteger('amount');
            $table->primary(['expense_id', 'user_id']);
            $table->index('user_id');
        });

        Schema::create('mailbox_expense_activity', function (Blueprint $table) {
            $table->id();
            $table->foreignId('group_id')->constrained('mailbox_expense_groups')->cascadeOnDelete();
            $table->foreignId('actor_id')->constrained('users')->restrictOnDelete();
            $table->string('action', 40);
            $table->foreignId('expense_id')->nullable()->constrained('mailbox_expenses')->cascadeOnDelete();
            $table->jsonb('data')->nullable();
            $table->timestamp('created_at');

            $table->index(['group_id', 'id']);
        });

        DB::table('mailbox_expense_groups')->insert([
            'name' => 'General',
            'is_general' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('mailbox_expense_activity');
        Schema::dropIfExists('mailbox_expense_shares');
        Schema::dropIfExists('mailbox_expenses');
        Schema::dropIfExists('mailbox_expense_group_members');
        Schema::dropIfExists('mailbox_expense_groups');
    }
};
