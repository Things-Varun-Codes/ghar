<?php

namespace Tests\Feature\Security;

use Tests\TestCase;

class SecurityHeadersTest extends TestCase
{
    public function test_security_headers_are_present_on_unauthenticated_page(): void
    {
        $response = $this->get(route('login'));

        $response->assertOk();

        // HSTS
        $response->assertHeader('Strict-Transport-Security');
        $hsts = $response->headers->get('Strict-Transport-Security');
        $this->assertStringContainsString('max-age=31536000', $hsts);
        $this->assertStringContainsString('includeSubDomains', $hsts);

        // Clickjacking
        $response->assertHeader('X-Frame-Options', 'DENY');

        // MIME sniffing
        $response->assertHeader('X-Content-Type-Options', 'nosniff');

        // Referrer
        $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

        // CSP must be present and include nonce + frame-ancestors
        $response->assertHeader('Content-Security-Policy');
        $csp = $response->headers->get('Content-Security-Policy');
        $this->assertStringContainsString('nonce-', $csp, 'CSP must contain a per-request nonce');
        $this->assertStringContainsString("frame-ancestors 'none'", $csp);

        // Explicit plugin-embedding  kill switch, stated on its own directive rather than left
        // to  inherit from default-src.
        $this->assertStringContainsString("object-src 'none'", $csp);
    }

    public function test_csp_nonce_is_per_request_not_static(): void
    {
        $first = $this->get(route('login'));
        $second = $this->get(route('login'));

        $nonce1 = $this->extractNonce($first->headers->get('Content-Security-Policy'));
        $nonce2 = $this->extractNonce($second->headers->get('Content-Security-Policy'));

        $this->assertNotEmpty($nonce1);
        $this->assertNotEmpty($nonce2);
        $this->assertNotEquals($nonce1, $nonce2, 'CSP nonce must differ between requests');
    }

    public function test_connect_src_includes_sentry_origin_when_dsn_is_set(): void
    {
        config()->set('sentry.dsn', 'https://publickey@errors.example.com/2');

        $response = $this->get(route('login'));
        $response->assertOk();

        $csp = $response->headers->get('Content-Security-Policy');
        $connectSrc = $this->extractDirective($csp, 'connect-src');

        $this->assertNotEmpty($connectSrc, 'connect-src directive must be present in CSP');
        $this->assertStringContainsString(
            'https://errors.example.com',
            $connectSrc,
            'connect-src must include Sentry origin derived from DSN'
        );
    }

    public function test_connect_src_omits_sentry_origin_when_dsn_is_unset(): void
    {
        config()->set('sentry.dsn', null);

        $response = $this->get(route('login'));
        $response->assertOk();

        $csp = $response->headers->get('Content-Security-Policy');
        $connectSrc = $this->extractDirective($csp, 'connect-src');

        $this->assertNotEmpty($connectSrc, 'connect-src directive must be present in CSP');
        $this->assertStringNotContainsString(
            'errors.example.com',
            $connectSrc,
            'connect-src must NOT include Sentry origin when DSN is unset'
        );
        // In testing env (APP_ENV=testing, not local), no Vite-dev origins are  injected —
        // connect-src should be exactly "'self'".
        $this->assertSame("'self'", trim($connectSrc));
    }

    public function test_img_src_includes_the_bucket_origin(): void
    {
        config()->set('filesystems.disks.s3.endpoint', 'https://abc.r2.cloudflarestorage.com');
        config()->set('filesystems.disks.s3.bucket', 'ghar');
        config()->set('filesystems.disks.s3.key', 'test-key');
        config()->set('filesystems.disks.s3.secret', 'test-secret');

        $response = $this->get(route('login'));
        $response->assertOk();

        $csp = $response->headers->get('Content-Security-Policy');
        $imgSrc = $this->extractDirective($csp, 'img-src');

        $this->assertNotEmpty($imgSrc, 'img-src directive must be present in CSP');
        $this->assertStringContainsString(
            'https://abc.r2.cloudflarestorage.com',
            $imgSrc,
            'img-src must include the bucket origin'
        );
        // Sanity: existing tokens preserved — we appended, not replaced.
        $this->assertStringContainsString("'self'", $imgSrc);
        $this->assertStringContainsString('data:', $imgSrc);
        $this->assertStringContainsString('blob:', $imgSrc);
    }

    public function test_media_src_includes_the_bucket_origin(): void
    {
        config()->set('filesystems.disks.s3.endpoint', 'https://abc.r2.cloudflarestorage.com');
        config()->set('filesystems.disks.s3.bucket', 'ghar');
        config()->set('filesystems.disks.s3.key', 'test-key');
        config()->set('filesystems.disks.s3.secret', 'test-secret');

        $response = $this->get(route('login'));
        $response->assertOk();

        $csp = $response->headers->get('Content-Security-Policy');
        $mediaSrc = $this->extractDirective($csp, 'media-src');

        $this->assertNotEmpty($mediaSrc, 'media-src directive must be present in CSP');
        $this->assertStringContainsString(
            'https://abc.r2.cloudflarestorage.com',
            $mediaSrc,
            'media-src must include the bucket origin'
        );
        $this->assertSame(
            "'self' blob: https://abc.r2.cloudflarestorage.com",
            trim($mediaSrc),
            'media-src must be exactly self + blob: + bucket origin (no data:, no extra tokens)'
        );
    }

    public function test_img_src_and_media_src_omit_r2_origin_when_endpoint_is_unset(): void
    {
        config()->set('filesystems.disks.s3.endpoint', null);

        $response = $this->get(route('login'));
        $response->assertOk();

        $csp = $response->headers->get('Content-Security-Policy');
        $imgSrc = $this->extractDirective($csp, 'img-src');
        $mediaSrc = $this->extractDirective($csp, 'media-src');

        $this->assertSame(
            "'self' data: blob: https://i.ytimg.com https://i.scdn.co https://*.spotifycdn.com https://images.plex.tv",
            trim($imgSrc),
            'img-src must be the default (incl. YT/Spotify thumbnail + Plex poster CDNs) when no bucket is configured'
        );
        $this->assertSame("'self' blob:", trim($mediaSrc), 'media-src must be exactly the default when no bucket is configured');

        // Defense in depth — malformed conditional-append would leave `;;` or ` ;`
        // artefacts.
        $this->assertStringNotContainsString(';;', $csp, 'CSP must contain no empty directive segments');
        $this->assertStringNotContainsString(' ;', $csp, 'CSP must contain no whitespace immediately before a semicolon');
    }

    public function test_link_header_is_removed_to_stay_under_cloudflare_edge_header_size_limit(): void
    {
        $response = $this->get(route('login'));

        $response->assertOk();

        $this->assertNull(
            $response->headers->get('Link'),
            'Link HTTP preload header must be stripped to stay under Cloudflare edge header byte limit.'
        );
    }

    private function extractNonce(string $csp): string
    {
        if (preg_match("/nonce-([A-Za-z0-9+\/=]+)/", $csp, $matches)) {
            return $matches[1];
        }

        return '';
    }

    public function test_a_virtual_hosted_bucket_adds_its_own_origin(): void
    {
        config()->set('filesystems.disks.s3.endpoint', null);
        config()->set('filesystems.disks.s3.region', 'eu-west-1');
        config()->set('filesystems.disks.s3.bucket', 'family-photos');
        config()->set('filesystems.disks.s3.use_path_style_endpoint', false);
        config()->set('filesystems.disks.s3.key', 'test-key');
        config()->set('filesystems.disks.s3.secret', 'test-secret');

        $imgSrc = $this->extractDirective(
            $this->get(route('login'))->headers->get('Content-Security-Policy'),
            'img-src',
        );

        $this->assertStringContainsString('https://family-photos.s3.eu-west-1.amazonaws.com', $imgSrc);
    }

    public function test_local_media_adds_no_bucket_origin(): void
    {
        config()->set('shell.media_disk', 'local');
        config()->set('filesystems.disks.s3.endpoint', 'https://abc.r2.cloudflarestorage.com');
        config()->set('filesystems.disks.s3.bucket', 'ghar');
        config()->set('filesystems.disks.s3.key', 'test-key');
        config()->set('filesystems.disks.s3.secret', 'test-secret');

        $imgSrc = $this->extractDirective(
            $this->get(route('login'))->headers->get('Content-Security-Policy'),
            'img-src',
        );

        $this->assertStringNotContainsString('r2.cloudflarestorage.com', $imgSrc);
    }

    private function extractDirective(string $csp, string $directive): string
    {
        foreach (explode(';', $csp) as $segment) {
            $segment = trim($segment);
            if (str_starts_with($segment, $directive.' ')) {
                return trim(substr($segment, strlen($directive) + 1));
            }
            if ($segment === $directive) {
                return '';
            }
        }

        return '';
    }
}
