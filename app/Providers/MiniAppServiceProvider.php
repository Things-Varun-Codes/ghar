<?php

namespace App\Providers;

use App\Shell\Services\Rooms;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

/**
 * Every room in the registry is installed: its provider, routes and migrations always load, so
 * the admin can turn it on without a restart and its data survives being turned off. Whether a
 * room is on is checked per request by the `room` middleware.
 */
class MiniAppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        foreach (config('miniapps', []) as $app) {
            if (! empty($app['provider'])) {
                $this->app->register($app['provider']);
            }
        }
    }

    public function boot(): void
    {
        foreach (config('miniapps', []) as $app) {
            $slug = $app['slug'] ?? null;
            if (! Rooms::validSlug($slug)) {
                continue;
            }

            $routesFile = base_path("routes/miniapps/{$slug}.php");
            if (file_exists($routesFile)) {
                Route::middleware(['web', 'auth', "room:{$slug}"])->group($routesFile);
            }

            $migrationsDir = database_path("migrations/{$slug}");
            if (is_dir($migrationsDir)) {
                $this->loadMigrationsFrom($migrationsDir);
            }
        }
    }
}
