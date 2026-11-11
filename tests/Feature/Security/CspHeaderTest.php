<?php

namespace Tests\Feature\Security;

use Illuminate\Support\Facades\Vite;
use Tests\TestCase;

class CspHeaderTest extends TestCase
{
    public function test_production_csp_script_src_is_nonce_only_no_unsafe_inline_no_unsafe_eval(): void
    {
        // Force the middleware's production branch for this request scope.
        $this->app->detectEnvironment(fn () => 'production');

        $response = $this->get('/login');

        $response->assertOk();

        $csp = $response->headers->get('Content-Security-Policy');
        $this->assertNotNull($csp, 'Content-Security-Policy header missing on /login');

        // script-src must be exactly `'self' 'nonce-{nonce}'` (no extra tokens  such as
        // 'unsafe-eval' or 'unsafe-inline' tacked on). The regex  matches up to the directive
        // terminator (`;` or end-of-string).
        $this->assertMatchesRegularExpression(
            "/script-src 'self' 'nonce-[A-Za-z0-9+\\/=]+'(;|$)/",
            $csp,
            "Production script-src must be exactly \"'self' 'nonce-{nonce}'\" — got CSP: {$csp}"
        );

        // Defense-in-depth: explicitly reject the two tokens we never want on  script-src in
        // production. (style-src 'unsafe-inline' is deliberately  allowed and NOT asserted
        // here — see top-of-file PHPDoc.)
        $this->assertStringNotContainsString(
            "script-src 'self' 'unsafe-inline'",
            $csp,
            "Production script-src must NOT carry 'unsafe-inline'"
        );
        $this->assertStringNotContainsString(
            "'unsafe-eval'",
            $csp,
            "Production CSP must NOT carry 'unsafe-eval' (local-only relaxation for Vite HMR)"
        );
    }

    public function test_local_csp_allows_the_running_vite_dev_server(): void
    {
        $hotFile = tempnam(sys_get_temp_dir(), 'hot');
        file_put_contents($hotFile, 'http://127.0.0.1:5173');
        Vite::useHotFile($hotFile);
        $this->app['env'] = 'local';

        $csp = (string) $this->get('/login')->headers->get('Content-Security-Policy');

        unlink($hotFile);

        $this->assertMatchesRegularExpression('#style-src [^;]*http://127\.0\.0\.1:5173#', $csp);
        $this->assertMatchesRegularExpression('#font-src [^;]*http://127\.0\.0\.1:5173#', $csp);
    }
}
