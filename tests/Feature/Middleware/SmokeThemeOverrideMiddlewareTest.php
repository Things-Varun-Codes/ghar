<?php

namespace Tests\Feature\Middleware;

use App\Http\Middleware\SmokeThemeOverrideMiddleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Tests\TestCase;

class SmokeThemeOverrideMiddlewareTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Deterministic allowlist so the slug-validation branch does not  depend on whatever
        // themes happen to ship in config/themes.php.
        config([
            'themes.themes' => [
                ['slug' => 'pastel'],
                ['slug' => 'warm'],
            ],
        ]);
    }

    public function test_production_environment_ignores_cookie(): void
    {
        // Flip env to production for the duration of this test. The  detectEnvironment
        // callback is reset by parent::tearDown's  app re-bind, but be explicit anyway.
        $this->app->detectEnvironment(fn () => 'production');

        $request = Request::create('/dashboard', 'GET');
        $request->cookies->set('smoke_theme', 'warm');

        (new SmokeThemeOverrideMiddleware)->handle($request, fn ($r) => new Response);

        $this->assertNull(
            $request->attributes->get('smoke_active_theme'),
            'Production env must short-circuit BEFORE any cookie read.'
        );
    }

    public function test_non_prod_with_invalid_slug_ignores_cookie(): void
    {
        // Default test env is 'testing' (non-prod). Explicit for clarity.
        $this->app->detectEnvironment(fn () => 'testing');

        $request = Request::create('/dashboard', 'GET');
        $request->cookies->set('smoke_theme', 'nonexistent-theme');

        (new SmokeThemeOverrideMiddleware)->handle($request, fn ($r) => new Response);

        $this->assertNull(
            $request->attributes->get('smoke_active_theme'),
            'Invalid slug must be rejected against config(themes.themes) allowlist.'
        );
    }

    public function test_non_prod_with_missing_cookie_ignores_cookie(): void
    {
        $this->app->detectEnvironment(fn () => 'testing');

        $request = Request::create('/dashboard', 'GET');
        // No cookie set.

        (new SmokeThemeOverrideMiddleware)->handle($request, fn ($r) => new Response);

        $this->assertNull(
            $request->attributes->get('smoke_active_theme'),
            'Missing cookie must result in no override (attribute stays unset).'
        );
    }

    public function test_non_prod_with_valid_cookie_sets_attribute(): void
    {
        $this->app->detectEnvironment(fn () => 'testing');

        $request = Request::create('/dashboard', 'GET');
        $request->cookies->set('smoke_theme', 'warm');

        (new SmokeThemeOverrideMiddleware)->handle($request, fn ($r) => new Response);

        $this->assertSame(
            'warm',
            $request->attributes->get('smoke_active_theme'),
            'Valid slug under non-prod env must populate the request attribute.'
        );
    }
}
