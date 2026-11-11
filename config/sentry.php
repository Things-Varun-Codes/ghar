<?php

return [
    'dsn' => env('SENTRY_LARAVEL_DSN', env('SENTRY_DSN')),

    // GHAR_VERSION is baked into release images; a source checkout falls back to its commit.
    'release' => env('SENTRY_RELEASE') ?: env('GHAR_VERSION') ?: trim(exec('git rev-parse --short HEAD 2>/dev/null') ?: 'dev'),

    'environment' => env('SENTRY_ENVIRONMENT', env('APP_ENV')),

    'org_id' => env('SENTRY_ORG_ID') === null ? null : (int) env('SENTRY_ORG_ID'),

    'sample_rate' => env('SENTRY_SAMPLE_RATE') === null ? 1.0 : (float) env('SENTRY_SAMPLE_RATE'),

    'traces_sample_rate' => env('SENTRY_TRACES_SAMPLE_RATE') === null ? 0.1 : (float) env('SENTRY_TRACES_SAMPLE_RATE'),

    'profiles_sample_rate' => env('SENTRY_PROFILES_SAMPLE_RATE') === null ? 0.0 : (float) env('SENTRY_PROFILES_SAMPLE_RATE'),

    'strict_trace_continuation' => env('SENTRY_STRICT_TRACE_CONTINUATION', false),

    'enable_logs' => env('SENTRY_ENABLE_LOGS', false),

    'log_flush_threshold' => env('SENTRY_LOG_FLUSH_THRESHOLD') === null ? null : (int) env('SENTRY_LOG_FLUSH_THRESHOLD'),

    'logs_channel_level' => env('SENTRY_LOG_LEVEL', env('SENTRY_LOGS_LEVEL', env('LOG_LEVEL', 'debug'))),

    'send_default_pii' => env('SENTRY_SEND_DEFAULT_PII', false),

    // AuthorizationException is deliberately absent: a spike of 403s on /admin is probing
    // worth seeing.
    'ignore_exceptions' => [
        Illuminate\Validation\ValidationException::class,
        Illuminate\Auth\AuthenticationException::class,
        Symfony\Component\HttpKernel\Exception\NotFoundHttpException::class,
        Symfony\Component\HttpKernel\Exception\HttpException::class,
    ],

    'ignore_transactions' => [
        '/up',
    ],

    'breadcrumbs' => [
        'logs' => env('SENTRY_BREADCRUMBS_LOGS_ENABLED', true),

        'cache' => env('SENTRY_BREADCRUMBS_CACHE_ENABLED', true),

        'livewire' => env('SENTRY_BREADCRUMBS_LIVEWIRE_ENABLED', true),

        'sql_queries' => env('SENTRY_BREADCRUMBS_SQL_QUERIES_ENABLED', true),

        'sql_bindings' => env('SENTRY_BREADCRUMBS_SQL_BINDINGS_ENABLED', false),

        'queue_info' => env('SENTRY_BREADCRUMBS_QUEUE_INFO_ENABLED', true),

        'command_info' => env('SENTRY_BREADCRUMBS_COMMAND_JOBS_ENABLED', true),

        'http_client_requests' => env('SENTRY_BREADCRUMBS_HTTP_CLIENT_REQUESTS_ENABLED', true),

        'notifications' => env('SENTRY_BREADCRUMBS_NOTIFICATIONS_ENABLED', true),
    ],

    'tracing' => [
        'queue_job_transactions' => env('SENTRY_TRACE_QUEUE_ENABLED', true),

        'queue_jobs' => env('SENTRY_TRACE_QUEUE_JOBS_ENABLED', true),

        'sql_queries' => env('SENTRY_TRACE_SQL_QUERIES_ENABLED', true),

        'sql_bindings' => env('SENTRY_TRACE_SQL_BINDINGS_ENABLED', false),

        'sql_origin' => env('SENTRY_TRACE_SQL_ORIGIN_ENABLED', true),

        'sql_origin_threshold_ms' => env('SENTRY_TRACE_SQL_ORIGIN_THRESHOLD_MS', 100),

        'views' => env('SENTRY_TRACE_VIEWS_ENABLED', true),

        'livewire' => env('SENTRY_TRACE_LIVEWIRE_ENABLED', true),

        'http_client_requests' => env('SENTRY_TRACE_HTTP_CLIENT_REQUESTS_ENABLED', true),

        'cache' => env('SENTRY_TRACE_CACHE_ENABLED', true),

        'redis_commands' => env('SENTRY_TRACE_REDIS_COMMANDS', false),

        'redis_origin' => env('SENTRY_TRACE_REDIS_ORIGIN_ENABLED', true),

        'notifications' => env('SENTRY_TRACE_NOTIFICATIONS_ENABLED', true),

        'missing_routes' => env('SENTRY_TRACE_MISSING_ROUTES_ENABLED', false),

        'continue_after_response' => env('SENTRY_TRACE_CONTINUE_AFTER_RESPONSE', true),

        'default_integrations' => env('SENTRY_TRACE_DEFAULT_INTEGRATIONS_ENABLED', true),
    ],
];
