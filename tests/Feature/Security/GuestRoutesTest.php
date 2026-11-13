<?php

namespace Tests\Feature\Security;

use Illuminate\Routing\Route as RoutingRoute;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class GuestRoutesTest extends TestCase
{
    /**
     * SECURITY.md says what answers without an account. A package can register a route of its
     * own (resend-laravel adds an unsigned webhook endpoint unless told not to), and this is
     * where it shows up.
     */
    public function test_only_the_documented_routes_answer_without_an_account(): void
    {
        $open = collect(Route::getRoutes()->getRoutes())
            ->reject(fn (RoutingRoute $route) => collect($route->gatherMiddleware())->contains(
                fn (mixed $middleware) => $middleware === 'auth' || (is_string($middleware) && str_starts_with($middleware, 'auth:'))
            ))
            ->flatMap(fn (RoutingRoute $route) => array_map(
                fn (string $method) => $method.' '.$route->uri(),
                array_diff($route->methods(), ['HEAD']),
            ))
            ->sort()
            ->values()
            ->all();

        $this->assertSame([
            'GET /',
            'GET forgot-password',
            'GET healthz',
            'GET invitations/{token}',
            'GET login',
            'GET reset-password/{token}',
            // Laravel's routes for the local media disk. Both refuse a URL that isn't signed.
            'GET storage/{path}',
            'GET up',
            'POST forgot-password',
            'POST invitations/{token}/accept',
            'POST login',
            'POST reset-password',
            'PUT storage/{path}',
        ], $open);
    }
}
