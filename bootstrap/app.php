<?php

use App\Http\Middleware\AddSecurityHeaders;
use App\Http\Middleware\BlockUnwantedFortifyRoutes;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SmokeThemeOverrideMiddleware;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Sentry\Laravel\Integration;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withCommands([
        __DIR__.'/../app/Shell/Console/Commands',
    ])
    ->withMiddleware(function (Middleware $middleware): void {
        // Global, not in the web group: under route:cache the compiled collection matches
        // first-registered-wins, so this must run before the router.
        $middleware->prepend(BlockUnwantedFortifyRoutes::class);

        // Written in plain text by Playwright, so EncryptCookies would strip it.
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state', 'smoke_theme']);

        // AddSecurityHeaders must come after HandleInertiaRequests, so the CSP nonce exists
        // before Vite renders tags.
        $middleware->web(append: [
            SmokeThemeOverrideMiddleware::class,
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddSecurityHeaders::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Replaces the default expectsJson() check, so it has to be included here.
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // Authenticated non-JSON 403s and 404s render inside the shell rather than on
        // Laravel's bare error screen.
        $exceptions->respond(function (SymfonyResponse $response, Throwable $e, Request $request): SymfonyResponse {
            $status = $response->getStatusCode();

            if (
                in_array($status, [403, 404], true)
                && ! $request->expectsJson()
                && $request->user() !== null
            ) {
                return Inertia::render('Shell/Pages/Error', ['status' => $status])
                    ->toResponse($request)
                    ->setStatusCode($status);
            }

            return $response;
        });

        Integration::handles($exceptions);
    })->create();
