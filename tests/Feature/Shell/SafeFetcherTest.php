<?php

namespace Tests\Feature\Shell;

use App\Shell\Support\Http\SafeFetcher;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/** Every outbound fetch the app makes. No test here touches the network or real DNS. */
class SafeFetcherTest extends TestCase
{
    private const PUBLIC_IP = '93.184.216.34';

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.url' => 'https://ghar.example.test']);
    }

    /** @param  array<string, list<string>>  $hosts  host => addresses; anything else is public */
    private function fetcher(array $hosts = []): SafeFetcher
    {
        return new SafeFetcher(fn (string $host): array => $hosts[$host] ?? [self::PUBLIC_IP]);
    }

    /** @return array<string, array{0: string}> */
    public static function refused(): array
    {
        return [
            'ftp' => ['ftp://example.com/file'],
            'file' => ['file:///etc/passwd'],
            'javascript' => ['javascript:alert(1)'],
            'data' => ['data:text/html,hi'],
            'no host' => ['https:///path'],
            'credentials' => ['https://user:secret@example.com/'],
            'user only' => ['https://user@example.com/'],
            'localhost' => ['http://localhost/'],
            'localhost upper case' => ['http://LOCALHOST:8000/'],
            'a .localhost name' => ['http://admin.localhost/'],
            'this app' => ['https://ghar.example.test/admin'],
            'this app, any port' => ['http://GHAR.example.test:8080/'],
            'loopback' => ['http://127.0.0.1/'],
            'loopback elsewhere in /8' => ['http://127.8.9.10/'],
            'unspecified' => ['http://0.0.0.0/'],
            'private 10/8' => ['http://10.1.2.3/'],
            'private 172.16/12' => ['http://172.20.0.1/'],
            'private 192.168/16' => ['http://192.168.1.1/'],
            'link-local' => ['http://169.254.1.1/'],
            'cloud metadata' => ['http://169.254.169.254/latest/meta-data/'],
            'carrier-grade NAT' => ['http://100.64.0.1/'],
            'benchmarking' => ['http://198.18.0.1/'],
            'multicast' => ['http://224.0.0.1/'],
            'IPv6 loopback' => ['http://[::1]/'],
            'IPv6 unique local' => ['http://[fd12:3456::1]/'],
            'IPv6 cloud metadata' => ['http://[fd00:ec2::254]/'],
            'IPv6 link-local' => ['http://[fe80::1]/'],
            'IPv4-mapped loopback' => ['http://[::ffff:127.0.0.1]/'],
            'IPv4-mapped metadata' => ['http://[::ffff:169.254.169.254]/'],
            'NAT64 private' => ['http://[64:ff9b::a00:1]/'],
            '6to4 private' => ['http://[2002:a00:1::]/'],
            'documentation range' => ['http://[2001:db8::1]/'],
        ];
    }

    #[DataProvider('refused')]
    public function test_an_address_that_must_not_be_reached_is_refused(string $url): void
    {
        Http::fake();
        $fetcher = $this->fetcher();

        $this->assertNull($fetcher->allowedTarget($url));
        $this->assertNull($fetcher->get($url, ['*/*'], 1024));
        Http::assertNothingSent();
    }

    public function test_a_host_resolving_to_any_private_address_is_refused_even_among_public_ones(): void
    {
        Http::fake();
        $fetcher = $this->fetcher([
            'mixed.example.com' => [self::PUBLIC_IP, '10.0.0.7'],
            'rebind.example.com' => ['127.0.0.1'],
            'v6.example.com' => ['2606:2800:220:1:248:1893:25c8:1946', '::1'],
            'nowhere.example.com' => [],
        ]);

        foreach (['mixed', 'rebind', 'v6', 'nowhere'] as $host) {
            $this->assertNull($fetcher->allowedTarget("https://{$host}.example.com/"), $host);
            $this->assertNull($fetcher->get("https://{$host}.example.com/", ['*/*'], 1024), $host);
        }
        Http::assertNothingSent();
    }

    public function test_the_pin_names_the_host_port_and_checked_address(): void
    {
        $fetcher = $this->fetcher(['v6.example.com' => ['2606:2800:220:1:248:1893:25c8:1946']]);

        $this->assertSame('example.com:443:'.self::PUBLIC_IP, $fetcher->allowedTarget('https://example.com/a?b=c'));
        $this->assertSame('example.com:80:'.self::PUBLIC_IP, $fetcher->allowedTarget('http://Example.com/'));
        $this->assertSame('example.com:8443:'.self::PUBLIC_IP, $fetcher->allowedTarget('https://example.com:8443/'));
        $this->assertSame('v6.example.com:443:[2606:2800:220:1:248:1893:25c8:1946]', $fetcher->allowedTarget('https://v6.example.com/'));
        // A public address written as the host is used as it is, without a lookup.
        $this->assertSame('8.8.8.8:443:8.8.8.8', $this->fetcher(['8.8.8.8' => ['10.0.0.1']])->allowedTarget('https://8.8.8.8/'));
    }

    /** @return array<string, array{0: string, 1: bool}> */
    public static function addresses(): array
    {
        return [
            'public v4' => ['8.8.8.8', true],
            'public v6' => ['2001:4860:4860::8888', true],
            'mapped public v4' => ['::ffff:8.8.8.8', true],
            'mapped private v4' => ['::ffff:192.168.0.1', false],
            'NAT64 public' => ['64:ff9b::808:808', true],
            'NAT64 private' => ['64:ff9b::a00:1', false],
            'CGNAT edge' => ['100.127.255.255', false],
            'just past CGNAT' => ['100.128.0.0', true],
            'not an address' => ['example.com', false],
            'public v4, another' => ['1.1.1.1', true],
            'public v6, another' => ['2606:4700:4700::1111', true],
            '6to4 public' => ['2002:808:808::1', true],
            'loopback' => ['127.0.0.1', false],
            'IPv6 loopback' => ['::1', false],
            'unspecified' => ['0.0.0.0', false],
            'IPv6 unspecified' => ['::', false],
            'private 10/8' => ['10.0.0.1', false],
            'private 172.16/12' => ['172.31.255.255', false],
            'private 192.168/16' => ['192.168.1.1', false],
            'link-local' => ['169.254.1.1', false],
            'cloud metadata' => ['169.254.169.254', false],
            'CGNAT' => ['100.64.0.1', false],
            'IPv6 unique local' => ['fd12:3456::1', false],
            'IPv6 cloud metadata' => ['fd00:ec2::254', false],
            'IPv6 link-local' => ['fe80::1', false],
            'NAT64 local-use' => ['64:ff9b:1::a00:1', false],
            'Teredo' => ['2001:0:4136:e378:8000:63bf:3fff:fdd2', false],
            'IPv6 benchmarking' => ['2001:2::1', false],
            'IPv6 site-local' => ['fec0::1', false],
            'IPv6 documentation 3fff::/20' => ['3fff::1', false],
            'SRv6 SIDs' => ['5f00::1', false],
            'IPv6 discard-only' => ['100::1', false],
            'IPv6 multicast' => ['ff02::1', false],
            'IPv4-compatible' => ['::10.0.0.1', false],
            'multicast' => ['224.0.0.1', false],
            'class E' => ['240.0.0.1', false],
            'IETF protocol assignments' => ['192.0.0.8', false],
            'broadcast' => ['255.255.255.255', false],
        ];
    }

    #[DataProvider('addresses')]
    public function test_is_public(string $ip, bool $public): void
    {
        $this->assertSame($public, SafeFetcher::isPublic($ip));
    }

    public function test_a_redirect_to_a_private_address_is_not_followed(): void
    {
        Http::fake([
            'public.example.com/*' => Http::response('', 302, ['Location' => 'http://inside.example.com/admin']),
            'inside.example.com/*' => Http::response('secret', 200, ['Content-Type' => 'text/html']),
        ]);
        $fetcher = $this->fetcher(['inside.example.com' => ['10.0.0.5']]);

        $this->assertNull($fetcher->get('https://public.example.com/go', ['text/html'], 1024));
        Http::assertSentCount(1);

        // Nor to a literal metadata address.
        Http::fake(['*' => Http::response('', 301, ['Location' => 'http://169.254.169.254/latest/'])]);
        $this->assertNull($fetcher->get('https://public.example.com/go', ['text/html'], 1024));
        Http::assertSentCount(1);
    }

    public function test_up_to_three_redirects_are_followed_and_a_fourth_is_refused(): void
    {
        // /hop/N redirects to /hop/N-1 (relative), and /hop/0 is the page.
        Http::fake(function (Request $request) {
            $n = (int) basename(parse_url($request->url(), PHP_URL_PATH));

            return $n === 0
                ? Http::response('<p>here</p>', 200, ['Content-Type' => 'text/html'])
                : Http::response('', 302, ['Location' => '/hop/'.($n - 1)]);
        });
        $fetcher = $this->fetcher();

        $found = $fetcher->get('https://example.com/hop/3', ['text/html'], 1024);
        $this->assertNotNull($found);
        $this->assertSame('https://example.com/hop/0', $found->url);
        $this->assertSame('<p>here</p>', $found->body);
        $this->assertSame('https://example.com/hop/0', $fetcher->finalUrl('https://example.com/hop/2'));

        $this->assertNull($fetcher->get('https://example.com/hop/4', ['text/html'], 1024));
        $this->assertNull($fetcher->finalUrl('https://example.com/hop/4'));
    }

    public function test_a_long_answer_is_cut_when_truncating_and_refused_otherwise(): void
    {
        Http::fake([
            'example.com/page' => Http::response(str_repeat('a', 5000), 200, ['Content-Type' => 'text/html']),
        ]);
        $fetcher = $this->fetcher();

        $cut = $fetcher->get('https://example.com/page', ['text/html'], 100, truncate: true);
        $this->assertSame(str_repeat('a', 100), $cut?->body);

        $this->assertNull($fetcher->get('https://example.com/page', ['text/html'], 100));
        $this->assertSame(5000, strlen((string) $fetcher->get('https://example.com/page', ['text/html'], 5000)?->body));
    }

    public function test_only_the_content_types_asked_for_come_back(): void
    {
        Http::fake([
            'example.com/html' => Http::response('<p>x</p>', 200, ['Content-Type' => 'text/html; charset=UTF-8']),
            'example.com/png' => Http::response('png', 200, ['Content-Type' => 'IMAGE/PNG']),
            'example.com/none' => Http::response('?', 200, ['Content-Type' => '']),
        ]);
        $fetcher = $this->fetcher();

        $html = $fetcher->get('https://example.com/html', ['text/html'], 1024);
        $this->assertSame('text/html', $html?->contentType);
        $this->assertNull($fetcher->get('https://example.com/html', ['image/png', 'image/jpeg'], 1024));
        $this->assertNull($fetcher->get('https://example.com/html', ['image/*'], 1024));

        $this->assertSame('image/png', $fetcher->get('https://example.com/png', ['image/*'], 1024)?->contentType);
        $this->assertNotNull($fetcher->get('https://example.com/png', ['*/*'], 1024));

        $this->assertNull($fetcher->get('https://example.com/none', ['text/html'], 1024));
    }

    public function test_a_failure_or_a_timeout_is_null(): void
    {
        $fetcher = $this->fetcher();

        Http::fake(['*' => Http::response('gone', 404, ['Content-Type' => 'text/html'])]);
        $this->assertNull($fetcher->get('https://example.com/', ['text/html'], 1024));

        Http::fake(['*' => Http::response('', 302)]);
        $this->assertNull($fetcher->get('https://example.com/', ['text/html'], 1024));

        Http::fake(fn () => throw new ConnectionException('timed out'));
        $this->assertNull($fetcher->get('https://example.com/', ['text/html'], 1024));
    }

    public function test_the_request_says_what_it_accepts_and_does_not_follow_redirects_itself(): void
    {
        Http::fake(['*' => Http::response('x', 200, ['Content-Type' => 'text/html'])]);

        $this->fetcher()->get('https://example.com/', ['text/html', 'image/png'], 1024);

        Http::assertSent(fn (Request $request) => $request->header('Accept') === ['text/html, image/png']
            && str_contains($request->header('User-Agent')[0] ?? '', 'Ghar'));
    }
}
