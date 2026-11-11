<?php

namespace App\Providers;

use Carbon\CarbonImmutable;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Queue\Events\JobFailed;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\View;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Laravel\Telescope\TelescopeServiceProvider;
use Sentry\State\Scope;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Local only, registered here rather than auto-discovered, so it can't ship to
        // production.
        if ($this->app->environment('local')) {
            $this->app->register(TelescopeServiceProvider::class);

            // Telescope's tables exist only where Telescope runs, so the package migrations
            // are loaded here rather than published.
            $this->loadMigrationsFrom(base_path('vendor/laravel/telescope/database/migrations'));
        }
    }

    public function boot(): void
    {
        // For responses that bypass HandleInertiaRequests, such as early error pages.
        View::share('activeTheme', config('themes.default', 'pastel'));

        $this->configureDefaults();
        $this->configureLimiters();
        $this->forceHttpsInProduction();
        $this->configureQueueFailureReporting();
    }

    /**
     * `failed_jobs` is only an audit trail; nobody watches it. This is what raises the
     * alarm.
     */
    protected function configureQueueFailureReporting(): void
    {
        Event::listen(function (JobFailed $event): void {
            \Sentry\withScope(function (Scope $scope) use ($event): void {
                $scope->setTags([
                    'component' => 'queue.'.$event->job->resolveName(),
                    'action' => 'job.failed',
                    'surface' => 'queue',
                    'connection' => $event->connectionName,
                ]);
                \Sentry\captureException($event->exception);
            });
        });
    }

    /**
     * TLS usually terminates upstream, so PHP may see HTTP while generated URLs must be
     * https. APP_URL says which applies: a plain http:// instance would otherwise be sent to
     * a port with no TLS.
     */
    protected function forceHttpsInProduction(): void
    {
        // isProduction(), not !environment('local'), so tests comparing absolute URLs still
        // see http.
        if (app()->isProduction() && ! str_starts_with((string) config('app.url'), 'http://')) {
            URL::forceScheme('https');
        }
    }

    protected function configureLimiters(): void
    {
        RateLimiter::for('invite-accept', function (Request $request) {
            return Limit::perMinute(60)->by($request->ip());
        });

        /**
         * Keyed by user, since every caller is an authenticated admin; keying by IP would
         * over-throttle admins sharing a home network.
         */
        RateLimiter::for('admin-mutations', function (Request $request) {
            return Limit::perMinute(30)->by((string) ($request->user()?->id ?? $request->ip()));
        });

        RateLimiter::for('invite-create', function (Request $request) {
            return Limit::perMinute(10)->by((string) ($request->user()?->id ?? $request->ip()));
        });

        RateLimiter::for('settings-profile', function (Request $request) {
            return Limit::perMinute(30)->by((string) ($request->user()?->id ?? $request->ip()));
        });

        RateLimiter::for('password-change', function (Request $request) {
            return Limit::perMinute(10)->by((string) ($request->user()?->id ?? $request->ip()));
        });

        RateLimiter::for('history-mutations', function (Request $request) {
            return Limit::perMinute(30)->by((string) ($request->user()?->id ?? $request->ip()));
        });

        RateLimiter::for('corner-mutations', function (Request $request) {
            return Limit::perMinute(30)->by((string) ($request->user()?->id ?? $request->ip()));
        });

        RateLimiter::for('linkable-picker', function (Request $request) {
            return Limit::perMinute(30)->by((string) ($request->user()?->id ?? $request->ip()));
        });

        RateLimiter::for('push-subscriptions', function (Request $request) {
            return Limit::perMinute(10)->by((string) ($request->user()?->id ?? $request->ip()));
        });

        /**
         * Tight because each call spends Cloudflare Workers AI quota.
         */
        RateLimiter::for('bouquet-generate', function (Request $request) {
            return Limit::perMinute(3)->by((string) ($request->user()?->id ?? $request->ip()));
        });

        RateLimiter::for('healthz', function (Request $request) {
            return Limit::perMinute(60)->by($request->ip());
        });
    }

    protected function configureDefaults(): void
    {
        Model::shouldBeStrict(! app()->isProduction());

        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
