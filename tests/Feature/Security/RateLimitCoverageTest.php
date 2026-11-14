<?php

namespace Tests\Feature\Security;

use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class RateLimitCoverageTest extends TestCase
{
    public function test_sweep_target_routes_have_expected_throttle_bindings(): void
    {
        // [method, uri (as $route->uri() returns it — no leading slash), expected limiter
        // name]  Source: the rate-limit sweep scope.
        $expectations = [
            ['PATCH',  'admin/users/{user}',            'admin-mutations'],
            ['DELETE', 'admin/users/{user}',            'admin-mutations'],
            ['POST',   'admin/invites',                 'invite-create'],
            ['POST',   'admin/invites/{invite}/resend', 'invite-create'],
            ['DELETE', 'admin/invites/{invite}',        'admin-mutations'],
            ['PATCH',  'settings/profile',              'settings-profile'],
            ['PUT',    'settings/password',             'password-change'],
            ['PATCH',  'apps/our-history/events/{event}', 'history-mutations'],
        ];

        $routes = Route::getRoutes();

        foreach ($expectations as [$method, $uri, $expectedLimiter]) {
            $route = collect($routes)->first(
                fn ($r) => in_array($method, $r->methods(), true) && $r->uri() === $uri
            );

            $this->assertNotNull(
                $route,
                "Route {$method} /{$uri} not found in routes/web.php"
            );

            $middleware = $route->gatherMiddleware();
            $expectedToken = "throttle:{$expectedLimiter}";

            $this->assertContains(
                $expectedToken,
                $middleware,
                "Route {$method} /{$uri} missing throttle:{$expectedLimiter} middleware (got: ".implode(', ', $middleware).')'
            );
        }
    }
}
