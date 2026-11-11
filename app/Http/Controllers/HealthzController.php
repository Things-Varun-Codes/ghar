<?php

namespace App\Http\Controllers;

use App\Shell\Support\Heartbeat;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Readiness probe. Unauthenticated, so the body says only which checks passed, nothing about
 * versions or configuration. Optional integrations (push, mail, the media bucket) never fail it.
 */
class HealthzController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $checks = [
            'database' => $this->database(),
            'queue' => $this->heartbeat(Heartbeat::QUEUE, config('shell.health.queue_stale_after_seconds')),
            'scheduler' => $this->heartbeat(Heartbeat::SCHEDULER, config('shell.health.scheduler_stale_after_seconds')),
            'disk' => $this->disk(),
        ];

        $healthy = ! in_array(false, $checks, true);

        $response = response()->json([
            'status' => $healthy ? 'ok' : 'failing',
            'checks' => array_map(fn (bool $ok): string => $ok ? 'ok' : 'failing', $checks),
        ], $healthy ? 200 : 503);

        $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate', true);

        return $response;
    }

    /**
     * A real query: a stale persistent PDO handle only fails on first use.
     */
    private function database(): bool
    {
        try {
            DB::connection()->select('select 1');

            return true;
        } catch (Throwable) {
            return false;
        }
    }

    private function heartbeat(string $key, int $staleAfterSeconds): bool
    {
        try {
            $last = Cache::get($key);
        } catch (Throwable) {
            return false;
        }

        if (is_int($last) && time() - $last < $staleAfterSeconds) {
            return true;
        }

        return $this->withinBootGrace();
    }

    private function withinBootGrace(): bool
    {
        $marker = config('shell.health.boot_marker');

        return is_file($marker)
            && time() - filemtime($marker) < config('shell.health.boot_grace_seconds');
    }

    private function disk(): bool
    {
        $free = disk_free_space(storage_path());

        return $free !== false && $free >= config('shell.health.min_free_disk_bytes');
    }
}
