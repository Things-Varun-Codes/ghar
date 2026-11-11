<?php

use App\MiniApps\History\Controllers\CalendarController;
use App\MiniApps\History\Controllers\EventsController;
use App\MiniApps\History\Controllers\GalleryController;
use App\MiniApps\History\Controllers\MediaController;
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
});
