<?php

namespace App\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class MiniAppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        foreach (config('miniapps', []) as $app) {
            if (! empty($app['enabled']) && ! empty($app['provider'])) {
                $this->app->register($app['provider']);
            }
        }
    }

    public function boot(): void
    {
        // The bundle compiles every app's pages, so their typed route helpers must exist even
        // for a disabled app. Generation never serves requests.
        $generatingRouteHelpers = $this->app->runningConsoleCommand('wayfinder:generate');

        foreach (config('miniapps', []) as $app) {
            if (empty($app['enabled']) && ! $generatingRouteHelpers) {
                continue;
            }

            $slug = $app['slug'] ?? null;
            if (! is_string($slug) || ! preg_match('/^[a-z][a-z0-9-]*$/', $slug)) {
                continue;
            }

            $routesFile = base_path("routes/miniapps/{$slug}.php");
            if (file_exists($routesFile)) {
                Route::middleware(['web', 'auth'])->group($routesFile);
            }

            if (empty($app['enabled'])) {
                continue;
            }

            $migrationsDir = database_path("migrations/{$slug}");
            if (is_dir($migrationsDir)) {
                $this->loadMigrationsFrom($migrationsDir);
            }
        }
    }
}
