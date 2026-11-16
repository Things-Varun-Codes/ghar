<?php

use App\MiniApps\Corner\Controllers\CornerController;
use App\MiniApps\Corner\Controllers\ItemsController;
use App\MiniApps\Corner\Controllers\LinkablePickerController;
use App\MiniApps\Corner\Controllers\ListsController;
use App\MiniApps\Corner\Controllers\OembedPreviewController;
use App\MiniApps\Corner\Controllers\PlexPreviewController;
use Illuminate\Support\Facades\Route;

/*
 * A list lives at /apps/our-corner/{slug} and its items at /apps/our-corner/{slug}/{id}. The
 * fixed words "lists" and "items" are reserved slugs (CreateList), so the routes that use
 * them never collide with a list.
 */
Route::prefix('apps/our-corner')->name('apps.our-corner.')->group(function () {
    Route::get('/', [CornerController::class, 'index'])->name('landing');

    Route::middleware('throttle:corner-mutations')->group(function () {
        Route::post('/lists', [ListsController::class, 'store'])->name('lists.store');
        Route::patch('/lists/{list}/move', [ListsController::class, 'move'])->name('lists.move');
        Route::patch('/lists/{list}', [ListsController::class, 'update'])->name('lists.update');
        Route::delete('/lists/{list}', [ListsController::class, 'destroy'])->name('lists.destroy');

        Route::patch('/items/{item}/toggle-done', [ItemsController::class, 'toggleDone'])->name('items.toggleDone');
        Route::patch('/items/{item}', [ItemsController::class, 'update'])->name('items.update');
        Route::delete('/items/{item}', [ItemsController::class, 'destroy'])->name('items.destroy');

        Route::post('/{list:slug}', [ItemsController::class, 'store'])->name('items.store');
    });

    // Looked up by hand rather than bound, so a missing list or item renders a page saying
    // so instead of a bare 404.
    Route::get('/{list}', [ItemsController::class, 'index'])->name('lists.show');
    Route::get('/{list}/{item}', [ItemsController::class, 'show'])->name('items.show');
});

Route::middleware('throttle:corner-mutations')
    ->get('/api/corner/oembed-preview', [OembedPreviewController::class, 'preview'])
    ->name('apps.our-corner.oembed.preview');

Route::middleware('throttle:corner-mutations')
    ->get('/api/corner/plex-preview', [PlexPreviewController::class, 'preview'])
    ->name('apps.our-corner.plex.preview');

/**
 * Outside the apps.our-corner prefix: this is a cross-app surface, since events live in Our
 * History.
 */
Route::middleware('throttle:linkable-picker')
    ->get('/api/linkable/search', [LinkablePickerController::class, 'search'])
    ->name('apps.our-corner.linkable.search');
