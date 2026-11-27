<?php

use App\MiniApps\Corner\Controllers\CornerController;
use App\MiniApps\Corner\Controllers\ItemsController;
use App\MiniApps\Corner\Controllers\LinkPreviewController;
use App\MiniApps\Corner\Controllers\ListsController;
use App\MiniApps\Corner\Controllers\PictureController;
use Illuminate\Support\Facades\Route;

/*
 * A list lives at /apps/our-shelf/{slug} and its items at /apps/our-shelf/{slug}/{id}. The
 * fixed words "lists" and "items" are reserved slugs (CreateList), so the routes that use
 * them never collide with a list.
 */
Route::prefix('apps/our-shelf')->name('apps.our-shelf.')->group(function () {
    Route::get('/', [CornerController::class, 'index'])->name('landing');

    Route::middleware('throttle:corner-mutations')->group(function () {
        Route::post('/lists', [ListsController::class, 'store'])->name('lists.store');
        Route::put('/lists/order', [ListsController::class, 'order'])->name('lists.order');
        Route::patch('/lists/{list}', [ListsController::class, 'update'])->name('lists.update');
        Route::delete('/lists/{list}', [ListsController::class, 'destroy'])->name('lists.destroy');

        Route::patch('/items/{item}/toggle-done', [ItemsController::class, 'toggleDone'])->name('items.toggleDone');
        Route::patch('/items/{item}', [ItemsController::class, 'update'])->name('items.update');
        Route::delete('/items/{item}', [ItemsController::class, 'destroy'])->name('items.destroy');

        Route::post('/{list:slug}', [ItemsController::class, 'store'])->name('items.store');
    });

    Route::get('/items/{item}/picture', [PictureController::class, 'show'])->name('items.picture');

    // Looked up by hand rather than bound, so a missing list or item renders a page saying
    // so instead of a bare 404.
    Route::get('/{list}', [ItemsController::class, 'index'])->name('lists.show');
    Route::get('/{list}/{item}', [ItemsController::class, 'show'])->name('items.show');
});

Route::middleware('throttle:corner-mutations')
    ->get('/api/corner/link-preview', [LinkPreviewController::class, 'preview'])
    ->name('apps.our-shelf.link.preview');

Route::middleware('throttle:corner-mutations')
    ->get('/api/corner/picture-preview', [PictureController::class, 'preview'])
    ->name('apps.our-shelf.picture.preview');
