<?php

use App\MiniApps\History\Models\Event;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Artisan;

/**
 * The thumb grew from 200px to 600px, sharp on a retina gallery tile. Thumbs are queued
 * conversions, so this only queues the work: existing photos sharpen as the worker gets to them.
 */
return new class extends Migration
{
    public function up(): void
    {
        Artisan::call('media-library:regenerate', [
            'modelType' => Event::class,
            '--only' => ['thumb'],
            '--force' => true,
        ]);
    }

    public function down(): void {}
};
