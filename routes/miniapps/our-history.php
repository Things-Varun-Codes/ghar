<?php

use App\MiniApps\History\Controllers\CalendarController;
use App\MiniApps\History\Controllers\CommentsController;
use App\MiniApps\History\Controllers\EventsController;
use App\MiniApps\History\Controllers\GalleryController;
use App\MiniApps\History\Controllers\MediaController;
use App\MiniApps\History\Controllers\ReactionsController;
use App\MiniApps\History\Models\EventReaction;
use Illuminate\Support\Facades\Route;

Route::prefix('apps/our-history')->name('apps.our-history.')->group(function () {
    Route::get('/', [EventsController::class, 'index'])->name('timeline');
    Route::get('/gallery', [GalleryController::class, 'index'])->name('gallery');
    Route::get('/calendar', [CalendarController::class, 'index'])->name('calendar');

    Route::middleware('throttle:history-mutations')->group(function () {
        Route::post('/events', [EventsController::class, 'store'])->name('events.store');
        Route::patch('/events/{event}', [EventsController::class, 'update'])->name('events.update');
        Route::delete('/events/{event}', [EventsController::class, 'destroy'])->name('events.destroy');

        Route::post('/events/{event}/media', [MediaController::class, 'store'])->name('media.store');
        Route::delete('/events/{event}/media/{media}', [MediaController::class, 'destroy'])->name('media.destroy');
    });

    Route::middleware('throttle:history-reactions')->group(function () {
        Route::put('/events/{event}/reactions/{reaction}', [ReactionsController::class, 'update'])
            ->whereIn('reaction', EventReaction::keys())
            ->name('events.reactions.update');
        Route::delete('/events/{event}/reactions/{reaction}', [ReactionsController::class, 'destroy'])
            ->whereIn('reaction', EventReaction::keys())
            ->name('events.reactions.destroy');
    });

    Route::middleware('throttle:history-comments')->group(function () {
        Route::post('/events/{event}/comments', [CommentsController::class, 'store'])->name('events.comments.store');
        Route::delete('/events/{event}/comments/{comment}', [CommentsController::class, 'destroy'])
            ->scopeBindings()
            ->name('events.comments.destroy');
    });
});
