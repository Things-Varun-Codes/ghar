<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * A bouquet becomes a postcard: any picture made from a prompt. What was sent keeps its picture
 * and note, and its flower names become the prompt. The admin's on/off switch moves with it.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::rename('mailbox_bouquets', 'mailbox_postcards');
        Schema::rename('mailbox_bouquet_recipients', 'mailbox_postcard_recipients');

        Schema::table('mailbox_postcard_recipients', function (Blueprint $table) {
            $table->renameColumn('bouquet_id', 'postcard_id');
        });

        Schema::table('mailbox_postcards', function (Blueprint $table) {
            $table->text('prompt')->nullable();
        });

        DB::statement(
            "update mailbox_postcards set prompt = 'A bouquet of ' || names.list
             from (
                 select p.id, string_agg(flower->>'name', ', ') as list
                 from mailbox_postcards p, json_array_elements(p.flowers) flower
                 group by p.id
             ) names
             where names.id = mailbox_postcards.id",
        );

        Schema::table('mailbox_postcards', function (Blueprint $table) {
            $table->dropColumn('flowers');
        });

        $this->moveSwitch('flowers', 'postcards');
    }

    public function down(): void
    {
        Schema::table('mailbox_postcards', function (Blueprint $table) {
            $table->json('flowers')->default('[]');
            $table->dropColumn('prompt');
        });

        Schema::table('mailbox_postcard_recipients', function (Blueprint $table) {
            $table->renameColumn('postcard_id', 'bouquet_id');
        });

        Schema::rename('mailbox_postcard_recipients', 'mailbox_bouquet_recipients');
        Schema::rename('mailbox_postcards', 'mailbox_bouquets');

        $this->moveSwitch('postcards', 'flowers');
    }

    private function moveSwitch(string $from, string $to): void
    {
        DB::table('room_settings')
            ->where('key', "our-exchange:{$from}")
            ->update(['key' => "our-exchange:{$to}"]);
    }
};
