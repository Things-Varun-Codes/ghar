<?php

namespace Tests\Feature\Mailbox;

use Illuminate\Routing\Route as RoutingRoute;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class MailboxRateLimitTest extends TestCase
{
    public function test_mailbox_limiters_are_defined(): void
    {
        $this->assertNotNull(RateLimiter::limiter('mailbox-mutations'));
        $this->assertNotNull(RateLimiter::limiter('postcard-generate'));
    }

    public function test_every_mailbox_write_has_its_own_limiter_not_corners(): void
    {
        $writes = collect(Route::getRoutes()->getRoutes())->filter(
            fn (RoutingRoute $route) => str_starts_with($route->uri(), 'apps/our-exchange/')
                && array_diff($route->methods(), ['GET', 'HEAD']) !== [],
        );

        $this->assertGreaterThanOrEqual(12, $writes->count());

        foreach ($writes as $route) {
            $middleware = $route->gatherMiddleware();
            $expected = $route->getName() === 'apps.our-exchange.postcards.generate'
                ? 'throttle:postcard-generate'
                : 'throttle:mailbox-mutations';

            $this->assertContains($expected, $middleware, $route->uri());
            $this->assertNotContains('throttle:corner-mutations', $middleware, $route->uri());
        }
    }
}
