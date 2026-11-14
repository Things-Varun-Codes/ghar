<?php

namespace App\Http\Middleware;

use App\Shell\Support\AppVersion;
use App\Shell\Support\MiniAppRegistry;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\View;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        $manifest = public_path('build/manifest.json');

        return file_exists($manifest) ? md5_file($manifest) : parent::version($request);
    }

    /** @return array<string, mixed> */
    public function share(Request $request): array
    {
        $user = $request->user();
        $user?->loadMissing('roles');
        $isAdmin = (bool) $user?->hasRole('admin');

        $miniApps = MiniAppRegistry::visibleFor($user, $isAdmin);

        // Falls back when the settings row or table is missing, which happens mid-deploy
        // before migrations run.
        $activeTheme = $request->attributes->get('smoke_active_theme');
        if ($activeTheme === null) {
            try {
                $activeTheme = DB::table('settings')
                    ->where('key', 'active_theme')
                    ->value('value');
            } catch (\Throwable $e) {
                // share() runs on every request; without this cache gate a deploy
                // mid-migration floods error tracking with identical events.
                Cache::remember(
                    'settings-table-missing-warned',
                    3600,
                    function () use ($e): string {
                        report($e);

                        return now()->toIso8601String();
                    }
                );
            }
        }
        $activeTheme ??= config('themes.default', 'pastel');

        // The root Blade view doesn't receive Inertia's shared props.
        View::share('activeTheme', $activeTheme);

        $themes = config('themes.themes', []);

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            // Signed-in only: an unauthenticated page shouldn't say which release is running.
            'version' => $user ? AppVersion::forPage() : null,
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'roles' => $user->getRoleNames()->values()->all(),
                ] : null,
            ],
            'miniApps' => $miniApps,
            'activeTheme' => $activeTheme,
            'themes' => $themes,
            'today' => now()->toDateString(),
            // EventForm reads this to drain staged uploads once the moment exists.
            'flash' => [
                'created_event_id' => fn () => $request->session()->get('created_event_id'),
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                // An ordinary prop, not the toast path: the email-pending notice has to
                // outlive the request that created it.
                'status' => fn () => $request->session()->get('status'),
            ],
            'vapidPublicKey' => config('webpush.vapid.public_key'),
            'googleMapsApiKey' => $request->user() ? config('services.google_maps.key') : null,
        ];
    }
}
