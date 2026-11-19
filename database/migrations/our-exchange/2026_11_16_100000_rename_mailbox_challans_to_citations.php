<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Postgres keeps the old names of a renamed table's indexes, constraints and sequence, and
 * Laravel derives those names from the table when a later migration drops one. Rows and
 * issued reference numbers are untouched.
 */
return new class extends Migration
{
    private const INDEXES = [
        'pkey',
        'ref_no_unique',
        'recipient_id_status_index',
        'issuer_id_status_index',
    ];

    private const FOREIGN_KEYS = [
        'issuer_id_foreign',
        'recipient_id_foreign',
    ];

    public function up(): void
    {
        $this->rename('mailbox_challans', 'mailbox_citations');
    }

    public function down(): void
    {
        $this->rename('mailbox_citations', 'mailbox_challans');
    }

    private function rename(string $from, string $to): void
    {
        Schema::rename($from, $to);

        foreach (self::INDEXES as $suffix) {
            DB::statement("alter index {$from}_{$suffix} rename to {$to}_{$suffix}");
        }

        foreach (self::FOREIGN_KEYS as $suffix) {
            DB::statement("alter table {$to} rename constraint {$from}_{$suffix} to {$to}_{$suffix}");
        }

        DB::statement("alter sequence {$from}_id_seq rename to {$to}_id_seq");
    }
};
