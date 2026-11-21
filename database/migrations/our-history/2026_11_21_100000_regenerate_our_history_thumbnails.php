<?php

use App\MiniApps\History\Models\Event;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Artisan;

/**
 * The photo sizes became a ladder (card, a 600px thumb, medium, large). Conversions are
 * queued, so this only queues the work: existing photos catch up as the worker gets to them.
 */
return new class extends Migration
{
    public function up(): void
    {
        Artisan::call('media-library:regenerate', [
            'modelType' => Event::class,
            '--only' => ['card', 'thumb', 'medium', 'large'],
            '--force' => true,
        ]);
    }

    public function down(): void {}
};
