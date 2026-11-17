<?php

namespace App\Http\Middleware;

use App\Shell\Support\AppVersion;
use App\Shell\Support\MiniAppRegistry;
use Illuminate\Http\Request;
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

        $miniApps = MiniAppRegistry::visibleFor($user);

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
            'today' => now()->toDateString(),
            'flash' => [
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
