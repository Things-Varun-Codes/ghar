<?php

namespace Tests\Feature;

use Tests\TestCase;

class SecurityHeadersCspReportTest extends TestCase
{
    public function test_csp_contains_report_uri_when_sentry_dsn_configured(): void
    {
        config(['sentry.dsn' => 'https://abc123publickey@errors.example.com/4']);

        $response = $this->get('/login');

        $response->assertOk();

        $csp = $response->headers->get('Content-Security-Policy');
        $this->assertNotNull($csp, 'CSP header missing');

        $this->assertStringContainsString(
            'report-uri https://errors.example.com/api/4/security/?sentry_key=abc123publickey',
            $csp,
            'CSP report-uri directive must point at the Glitchtip endpoint derived from sentry.dsn'
        );
    }

    public function test_csp_omits_report_uri_when_sentry_dsn_not_configured(): void
    {
        config(['sentry.dsn' => null]);

        $response = $this->get('/login');

        $response->assertOk();

        $csp = $response->headers->get('Content-Security-Policy');
        $this->assertNotNull($csp, 'CSP header missing');

        $this->assertStringNotContainsString(
            'report-uri',
            $csp,
            'CSP must omit report-uri when sentry DSN is not configured'
        );
    }

    public function test_total_response_header_size_under_cf_edge_cap(): void
    {
        config(['sentry.dsn' => 'https://abc123publickey@errors.example.com/4']);

        $response = $this->get('/login');

        $response->assertOk();

        $total = 0;
        foreach ($response->headers->all() as $name => $values) {
            foreach ((array) $values as $value) {
                // `Name: value\r\n` — wire format approximation
                $total += strlen($name) + 2 + strlen((string) $value) + 2;
            }
        }

        $this->assertLessThan(
            6000,
            $total,
            "Response header total bytes ({$total}) exceeds Cloudflare ~6 KB edge cap"
        );
    }

    public function test_report_uri_is_its_own_csp_directive(): void
    {
        config(['sentry.dsn' => 'https://abc123publickey@errors.example.com/4']);

        $response = $this->get('/login');

        $response->assertOk();

        $csp = $response->headers->get('Content-Security-Policy');
        $this->assertNotNull($csp, 'CSP header missing');

        $directives = array_map('trim', explode(';', $csp));
        $reportUriDirectives = array_filter(
            $directives,
            fn (string $d) => str_starts_with($d, 'report-uri ')
        );

        $this->assertCount(
            1,
            $reportUriDirectives,
            'Exactly one `report-uri` directive must appear in CSP'
        );
    }
}
