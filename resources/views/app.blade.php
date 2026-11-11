<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" data-theme="{{ $activeTheme ?? 'pastel' }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <meta name="robots" content="noindex, nofollow">

        <style>
            html {
                background-color: oklch(0.975 0.012 80);
            }
            #app-splash {
                position: fixed;
                inset: 0;
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                background-color: #fbf6ee;
                color: oklch(0.55 0.08 135);
                font-family: 'Instrument Serif', Georgia, serif;
                font-size: 48px;
                font-weight: 400;
                line-height: 1;
                letter-spacing: -0.01em;
            }
            @media (max-width: 480px) {
                #app-splash { font-size: 36px; }
            }
            .app-splash--fade {
                opacity: 0;
                transition: opacity 180ms ease-out;
            }
            .app-splash__wordmark {
                animation: app-splash-pulse 1.6s ease-in-out infinite alternate;
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
        <meta name="theme-color" content="#fbf6ee">
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
            <span class="app-splash__wordmark" aria-hidden="true">{{ config('app.name') }}</span>
            <span style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);">Loading {{ config('app.name') }}</span>
        </div>
        <x-inertia::app />
    </body>
</html>
