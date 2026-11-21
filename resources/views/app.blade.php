@php
    // Light or Dark as chosen; System (and a guest) leaves it to the device.
    $theme = auth()->user()?->theme;
    $theme = $theme === \App\Enums\Theme::System ? null : $theme?->value;
    $deviceScheme = ['light' => '(prefers-color-scheme: light)', 'dark' => '(prefers-color-scheme: dark)'];
@endphp
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}"@if ($theme) data-theme="{{ $theme }}"@endif>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">

        <meta name="robots" content="noindex, nofollow">

        <style>
            /* --shell-bg and --shell-accent-text in hex; app.css isn't loaded yet. */
            html {
                --splash-bg: #f6f3ee;
                --splash-ink: #b75536;
                background-color: var(--splash-bg);
            }
            html[data-theme='dark'] {
                --splash-bg: #1c1916;
                --splash-ink: #ef9778;
            }
            @media (prefers-color-scheme: dark) {
                html:not([data-theme='light']) {
                    --splash-bg: #1c1916;
                    --splash-ink: #ef9778;
                }
            }
            #app-splash {
                position: fixed;
                inset: 0;
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                background-color: var(--splash-bg);
                /* The wordmark as the app draws it: Fraunces 600 in coral. */
                color: var(--splash-ink);
                font-family: 'Fraunces', ui-serif, Georgia, serif;
                font-size: 48px;
                font-weight: 600;
                line-height: 1;
                letter-spacing: -0.02em;
            }
            @media (max-width: 480px) {
                #app-splash { font-size: 36px; }
            }
            .app-splash--fade {
                opacity: 0;
                transition: opacity 180ms ease-out;
            }
            .app-splash__wordmark {
                display: flex;
                align-items: center;
                gap: 12px;
                animation: app-splash-pulse 1.6s ease-in-out infinite alternate;
            }
            .app-splash__wordmark img {
                width: 1em;
                height: 1em;
            }
            @keyframes app-splash-pulse {
                from { opacity: 0.55 }
                to   { opacity: 1 }
            }
            @media (prefers-reduced-motion: reduce) {
                #app-splash * { animation: none !important; }
            }
        </style>

        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">

        <link rel="manifest" href="/manifest.webmanifest">
        @foreach (['light' => '#f6f3ee', 'dark' => '#1c1916'] as $scheme => $color)
            <meta name="theme-color" data-scheme="{{ $scheme }}" content="{{ $color }}" media="{{ $theme ? ($theme === $scheme ? 'all' : 'not all') : $deviceScheme[$scheme] }}">
        @endforeach
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="default">
        <meta name="apple-mobile-web-app-title" content="{{ config('app.name') }}">
        <meta name="application-name" content="{{ config('app.name') }}">
        @if (filled(config('services.sentry_browser.dsn')))
            <meta name="sentry-dsn" content="{{ config('services.sentry_browser.dsn') }}">
            <meta name="sentry-environment" content="{{ config('sentry.environment') }}">
            <meta name="sentry-release" content="{{ config('sentry.release') }}">
        @endif
        <meta name="mobile-web-app-capable" content="yes">

        @fonts

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx'])
        <x-inertia::head>
            <title>{{ config('app.name') }}</title>
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <div id="app-splash" role="status">
            <span class="app-splash__wordmark" aria-hidden="true"><img src="/favicon.svg" alt="">{{ config('app.name') }}</span>
            <span style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);">Loading {{ config('app.name') }}</span>
        </div>
        <x-inertia::app />
    </body>
</html>
