<?php

namespace Tests\Feature;

use App\Shell\Jobs\RecordQueueHeartbeat;
use App\Shell\Support\Heartbeat;
use Illuminate\Cache\RateLimiter as CacheRateLimiter;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Console\Scheduling\CallbackEvent;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class HealthzControllerTest extends TestCase
{
    use RefreshDatabase;

    private string $marker;

    protected function setUp(): void
    {
        parent::setUp();

        $this->marker = tempnam(sys_get_temp_dir(), 'ghar-boot');
        unlink($this->marker);
        config()->set('shell.health.boot_marker', $this->marker);

        Heartbeat::record(Heartbeat::SCHEDULER);
        Heartbeat::record(Heartbeat::QUEUE);
    }

    protected function tearDown(): void
    {
        if (is_file($this->marker)) {
            unlink($this->marker);
        }

        parent::tearDown();
    }

    private function breakDatabase(): void
    {
        config()->set('database.connections.pgsql.host', '127.0.0.1');
        config()->set('database.connections.pgsql.port', 1);
        DB::purge('pgsql');
    }

    private function restoreDatabase(int|string $port, string $host): void
    {
        config()->set('database.connections.pgsql.host', $host);
        config()->set('database.connections.pgsql.port', $port);
        DB::purge('pgsql');
    }

    public function test_all_green_returns_200_with_exact_shape(): void
    {
        $this->getJson('/healthz')
            ->assertOk()
            ->assertExactJson([
                'status' => 'ok',
                'checks' => [
                    'database' => 'ok',
                    'queue' => 'ok',
                    'scheduler' => 'ok',
                    'disk' => 'ok',
                ],
            ]);
    }

    public function test_optional_integrations_do_not_affect_readiness(): void
    {
        config()->set('webpush.vapid.public_key', null);
        config()->set('webpush.vapid.private_key', null);
        config()->set('services.resend.key', null);
        config()->set('filesystems.disks.s3.key', null);
        config()->set('filesystems.disks.s3.bucket', null);

        $this->getJson('/healthz')->assertOk();
    }

    public function test_stale_scheduler_fails(): void
    {
        Cache::forever(Heartbeat::SCHEDULER, time() - 181);

        $this->getJson('/healthz')
            ->assertStatus(503)
            ->assertJsonPath('status', 'failing')
            ->assertJsonPath('checks.scheduler', 'failing')
            ->assertJsonPath('checks.queue', 'ok');
    }

    public function test_stale_queue_fails(): void
    {
        Cache::forever(Heartbeat::QUEUE, time() - 601);

        $this->getJson('/healthz')
            ->assertStatus(503)
            ->assertJsonPath('checks.queue', 'failing')
            ->assertJsonPath('checks.scheduler', 'ok');
    }

    public function test_missing_heartbeats_fail_without_a_boot_marker(): void
    {
        Cache::forget(Heartbeat::SCHEDULER);
        Cache::forget(Heartbeat::QUEUE);

        $this->getJson('/healthz')
            ->assertStatus(503)
            ->assertJsonPath('checks.queue', 'failing')
            ->assertJsonPath('checks.scheduler', 'failing');
    }

    public function test_fresh_boot_is_ready_during_the_grace_window(): void
    {
        Cache::forget(Heartbeat::SCHEDULER);
        Cache::forever(Heartbeat::QUEUE, time() - 3600);
        touch($this->marker);

        $this->getJson('/healthz')->assertOk();
    }

    public function test_grace_window_ends(): void
    {
        Cache::forget(Heartbeat::SCHEDULER);
        touch($this->marker, time() - 301);

        $this->getJson('/healthz')
            ->assertStatus(503)
            ->assertJsonPath('checks.scheduler', 'failing');
    }

    public function test_low_disk_fails_and_has_no_grace(): void
    {
        config()->set('shell.health.min_free_disk_bytes', PHP_INT_MAX);
        touch($this->marker);

        $this->getJson('/healthz')
            ->assertStatus(503)
            ->assertJsonPath('checks.disk', 'failing');
    }

    public function test_database_outage_returns_503_even_with_the_cache_in_the_database(): void
    {
        $host = config('database.connections.pgsql.host');
        $port = config('database.connections.pgsql.port');
        config()->set('cache.default', 'database');
        Cache::forgetDriver('database');
        $this->app->forgetInstance(CacheRateLimiter::class);
        RateLimiter::clearResolvedInstances();
        RateLimiter::for('healthz', fn () => Limit::perMinute(60));
        $this->breakDatabase();
        touch($this->marker);

        try {
            $this->getJson('/healthz')
                ->assertStatus(503)
                ->assertJsonPath('status', 'failing')
                ->assertJsonPath('checks.database', 'failing')
                ->assertJsonPath('checks.queue', 'failing')
                ->assertJsonPath('checks.scheduler', 'failing');
        } finally {
            $this->restoreDatabase($port, $host);
        }
    }

    public function test_liveness_has_no_dependencies(): void
    {
        $host = config('database.connections.pgsql.host');
        $port = config('database.connections.pgsql.port');
        config()->set('cache.default', 'database');
        Cache::forgetDriver('database');
        $this->breakDatabase();

        try {
            $this->get('/up')->assertOk();
        } finally {
            $this->restoreDatabase($port, $host);
        }
    }

    public function test_scheduler_writes_its_heartbeat_and_queues_the_worker_one(): void
    {
        Cache::forget(Heartbeat::SCHEDULER);
        Queue::fake();

        $events = collect(app(Schedule::class)->events())
            ->filter(fn ($event) => $event instanceof CallbackEvent && $event->expression === '* * * * *');

        $this->assertCount(2, $events);
        $events->each(fn (CallbackEvent $event) => $event->run(app()));

        $this->assertIsInt(Cache::get(Heartbeat::SCHEDULER));
        Queue::assertPushed(RecordQueueHeartbeat::class);
    }

    public function test_the_job_records_the_queue_heartbeat(): void
    {
        Cache::forget(Heartbeat::QUEUE);

        (new RecordQueueHeartbeat)->handle();

        $this->assertIsInt(Cache::get(Heartbeat::QUEUE));
    }

    public function test_response_carries_no_cache_header(): void
    {
        $cacheControl = (string) $this->getJson('/healthz')->headers->get('Cache-Control');

        $this->assertStringContainsString('no-store', $cacheControl);
        $this->assertStringContainsString('no-cache', $cacheControl);
        $this->assertStringContainsString('must-revalidate', $cacheControl);
    }

    public function test_response_does_not_carry_inertia_or_session_or_csp_headers(): void
    {
        $response = $this->getJson('/healthz');

        $this->assertNull($response->headers->get('X-Inertia-Version'));
        $this->assertNull($response->headers->get('Content-Security-Policy'));
        $this->assertEmpty($response->headers->getCookies());
    }
}
