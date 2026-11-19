<?php

namespace App\Http\Middleware;

use App\Shell\Services\LinkableEntities;
use App\Shell\Support\AppVersion;
use App\Shell\Support\MiniAppRegistry;
use App\Shell\Support\Person;
use App\Shell\Support\Region;
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
                    ...Person::of($user),
                    'email' => $user->email,
                    'roles' => $user->getRoleNames()->values()->all(),
                ] : null,
            ],
            'miniApps' => $miniApps,
            'linking' => fn () => $user ? app(LinkableEntities::class)->forPage() : null,
            // The household's date, not the server's: GHAR_TIMEZONE.
            'today' => Region::today()->toDateString(),
            'region' => Region::forPage(),
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
