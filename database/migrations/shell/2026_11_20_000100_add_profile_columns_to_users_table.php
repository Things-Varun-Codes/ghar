<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // An object key on the media disk, never a URL: pages get a signed one.
            $table->string('avatar_key')->nullable();
            // A whole date or nothing; there are no partial birthdays.
            $table->date('birthday')->nullable();
            $table->boolean('morning_memories')->default(true);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['avatar_key', 'birthday', 'morning_memories']);
        });
    }
};
