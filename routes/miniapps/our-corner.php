<?php

use App\MiniApps\Corner\Controllers\ActivitiesController;
use App\MiniApps\Corner\Controllers\CornerController;
use App\MiniApps\Corner\Controllers\LinkablePickerController;
use App\MiniApps\Corner\Controllers\MoviesController;
use App\MiniApps\Corner\Controllers\OembedPreviewController;
use App\MiniApps\Corner\Controllers\PlacesController;
use App\MiniApps\Corner\Controllers\PlexPreviewController;
use App\MiniApps\Corner\Controllers\SongsController;
use Illuminate\Support\Facades\Route;

Route::prefix('apps/our-corner')->name('apps.our-corner.')->group(function () {
    Route::get('/', [CornerController::class, 'index'])->name('landing');
    Route::get('/songs', [SongsController::class, 'index'])->name('songs.index');
    Route::get('/songs/{song}', [SongsController::class, 'show'])->name('songs.show');
    Route::get('/movies', [MoviesController::class, 'index'])->name('movies.index');
    Route::get('/movies/{movie}', [MoviesController::class, 'show'])->name('movies.show');
    Route::get('/activities', [ActivitiesController::class, 'index'])->name('activities.index');
    Route::get('/activities/{activity}', [ActivitiesController::class, 'show'])->name('activities.show');
    Route::get('/places', [PlacesController::class, 'index'])->name('places.index');
    Route::get('/places/{place}', [PlacesController::class, 'show'])->name('places.show');

    Route::middleware('throttle:corner-mutations')->group(function () {
        Route::post('/songs', [SongsController::class, 'store'])->name('songs.store');
        Route::patch('/songs/{song}/toggle-done', [SongsController::class, 'toggleDone'])->name('songs.toggleDone');
        Route::patch('/songs/{song}', [SongsController::class, 'update'])->name('songs.update');
        Route::delete('/songs/{song}', [SongsController::class, 'destroy'])->name('songs.destroy');

        Route::post('/movies', [MoviesController::class, 'store'])->name('movies.store');
        Route::patch('/movies/{movie}/toggle-done', [MoviesController::class, 'toggleDone'])->name('movies.toggleDone');
        Route::patch('/movies/{movie}', [MoviesController::class, 'update'])->name('movies.update');
        Route::delete('/movies/{movie}', [MoviesController::class, 'destroy'])->name('movies.destroy');

        Route::post('/activities', [ActivitiesController::class, 'store'])->name('activities.store');
        Route::patch('/activities/{activity}/toggle-done', [ActivitiesController::class, 'toggleDone'])->name('activities.toggleDone');
        Route::patch('/activities/{activity}', [ActivitiesController::class, 'update'])->name('activities.update');
        Route::delete('/activities/{activity}', [ActivitiesController::class, 'destroy'])->name('activities.destroy');

        Route::post('/places', [PlacesController::class, 'store'])->name('places.store');
        Route::patch('/places/{place}/toggle-done', [PlacesController::class, 'toggleDone'])->name('places.toggleDone');
        Route::patch('/places/{place}', [PlacesController::class, 'update'])->name('places.update');
        Route::delete('/places/{place}', [PlacesController::class, 'destroy'])->name('places.destroy');
    });
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
