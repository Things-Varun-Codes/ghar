<?php

namespace Tests\Feature\DevOps;

use Tests\TestCase;

class DeployOpsContractTest extends TestCase
{
    public function test_entrypoint_restarts_the_queue_before_handing_off_to_supervisord(): void
    {
        $path = base_path('docker/docker-entrypoint.sh');
        $this->assertFileExists($path, 'docker/docker-entrypoint.sh must ship at repo root');

        $content = file_get_contents($path);

        $this->assertStringContainsString(
            'php artisan queue:restart',
            $content,
            'entrypoint must invoke `php artisan queue:restart`'
        );

        $migratePos = strpos($content, 'php artisan migrate --isolated --force');
        $queueRestartPos = strpos($content, 'php artisan queue:restart');
        $execPos = strpos($content, 'exec "$@"');

        $this->assertNotFalse($migratePos, 'entrypoint must still run the isolated migrate step');
        $this->assertNotFalse($execPos, 'entrypoint must still hand off to the CMD via exec "$@"');

        $this->assertGreaterThan(
            $migratePos,
            $queueRestartPos,
            'queue:restart must run AFTER the migrate step, so the cache tables it depends on already exist'
        );

        $this->assertLessThan(
            $execPos,
            $queueRestartPos,
            'queue:restart must run BEFORE the exec "$@" handoff — a line appended after exec would never run'
        );
    }

    public function test_compose_defaults_the_log_channel_to_stderr(): void
    {
        $path = base_path('docker-compose.yml');
        $this->assertFileExists($path, 'docker-compose.yml must ship at repo root');

        $content = file_get_contents($path);

        $this->assertMatchesRegularExpression(
            '/LOG_CHANNEL:\s*\$\{LOG_CHANNEL:-stderr\}/',
            $content,
            'docker-compose.yml must default LOG_CHANNEL to stderr in production'
        );
    }

    public function test_compose_passes_through_what_the_app_reads(): void
    {
        $content = file_get_contents(base_path('docker-compose.yml'));

        foreach ([
            'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT', 'SENTRY_LARAVEL_DSN', 'MEDIA_DISK',
            'BOUQUET_IMAGE_PROVIDER', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_WORKERS_AI_TOKEN', 'GOOGLE_MAPS_API_KEY',
        ] as $key) {
            $this->assertStringContainsString("{$key}: \${{$key}:-", $content);
        }
    }

    public function test_compose_stays_production_only(): void
    {
        $content = file_get_contents(base_path('docker-compose.yml'));

        $this->assertDoesNotMatchRegularExpression('/^\s+(postgres|mailpit|db):\s*$/m', $content);
    }

    public function test_images_are_pinned(): void
    {
        $dockerfile = file_get_contents(base_path('Dockerfile'));
        preg_match_all('/^FROM (\S+)/m', $dockerfile, $matches);

        $this->assertNotEmpty($matches[1]);

        foreach ($matches[1] as $image) {
            $this->assertMatchesRegularExpression('/:\d+\.\d+\.\d+/', $image, "{$image} must be pinned to a patch version");
        }

        $this->assertStringNotContainsString(':latest', file_get_contents(base_path('docker-compose.override.yml')));
    }

    public function test_nginx_never_serves_sourcemaps(): void
    {
        $this->assertStringContainsString(
            'location ~ \.map$ {',
            file_get_contents(base_path('docker/nginx/default.conf')),
        );
    }
}
