<?php

namespace App\Shell\Support\Http;

use Closure;
use GuzzleHttp\Psr7\Uri;
use GuzzleHttp\Psr7\UriResolver;
use Illuminate\Support\Facades\Http;
use OverflowException;
use Psr\Http\Message\ResponseInterface;
use Throwable;

/**
 * The only way the app reaches an address someone pasted. People paste anything, and the server
 * must never be talked into fetching from inside the network it runs in, so every hop is held
 * to these rules:
 *
 * - http and https only, no credentials in the address, never this app's own host;
 * - the host is resolved here and every address it resolves to must be public (not private,
 *   loopback, link-local, carrier-grade NAT, multicast, reserved or a cloud metadata address,
 *   including IPv4 hidden inside IPv6), and the connection is pinned to the checked address so
 *   a second lookup can't answer differently;
 * - redirects are followed by hand, at most three, each re-checked;
 * - short timeouts and a cap on how much is read.
 *
 * Anything refused or failing comes back as null: the caller saves what it has.
 */
class SafeFetcher
{
    private const MAX_REDIRECTS = 3;

    private const CONNECT_TIMEOUT_SECONDS = 3;

    private const TIMEOUT_SECONDS = 6;

    private const USER_AGENT = 'Mozilla/5.0 (compatible; Ghar link preview)';

    /** CIDR blocks no fetch may reach, beyond PHP's private and reserved ranges. */
    private const BLOCKED = [
        '0.0.0.0/8', '10.0.0.0/8', '100.64.0.0/10', '127.0.0.0/8', '169.254.0.0/16', '172.16.0.0/12',
        '192.0.0.0/24', '192.0.2.0/24', '192.168.0.0/16', '198.18.0.0/15', '198.51.100.0/24',
        '203.0.113.0/24', '224.0.0.0/3',
        '::/128', '::1/128', 'fc00::/7', 'fe80::/10', 'ff00::/8', '2001:db8::/32', '100::/64',
    ];

    /** @var Closure(string): list<string> */
    private Closure $resolver;

    /** @param  (Closure(string): list<string>)|null  $resolver  host to its addresses; tests stub it */
    public function __construct(?Closure $resolver = null)
    {
        $this->resolver = $resolver ?? self::resolve(...);
    }

    /**
     * @param  list<string>  $accept  content types to ask for; the answer must match one
     * @param  bool  $truncate  keep the first $maxBytes of a longer answer (a page's head is
     *                          enough), or refuse it (a picture cut short is no picture)
     */
    public function get(string $url, array $accept, int $maxBytes, bool $truncate = false): ?FetchedResponse
    {
        $current = $url;

        for ($hop = 0; $hop <= self::MAX_REDIRECTS; $hop++) {
            $target = $this->allowedTarget($current);
            if ($target === null) {
                return null;
            }

            $answer = $this->request($current, $target, $accept, $maxBytes);
            if ($answer === null) {
                return null;
            }

            [$status, $headers, $body, $cut] = $answer;

            $location = $headers->getHeaderLine('Location');
            if ($status >= 300 && $status < 400 && $location !== '') {
                $current = (string) UriResolver::resolve(new Uri($current), new Uri($location));

                continue;
            }

            if ($status < 200 || $status >= 300) {
                return null;
            }

            $type = strtolower(trim(explode(';', $headers->getHeaderLine('Content-Type'))[0]));
            if (! self::typeMatches($type, $accept)) {
                return null;
            }

            if ($cut || strlen($body) > $maxBytes) {
                if (! $truncate) {
                    return null;
                }

                $body = substr($body, 0, $maxBytes);
            }

            return new FetchedResponse($current, $type, $body);
        }

        return null;
    }

    /** The final address a link lands on, without reading what is there. */
    public function finalUrl(string $url): ?string
    {
        return $this->get($url, ['text/html', '*/*'], 1, truncate: true)?->url;
    }

    /**
     * The curl "host:port:address" pin for a URL that may be fetched, or null.
     */
    public function allowedTarget(string $url): ?string
    {
        $parts = parse_url($url);
        if ($parts === false) {
            return null;
        }

        $scheme = strtolower($parts['scheme'] ?? '');
        $host = strtolower(trim($parts['host'] ?? '', '[]'));
        if (! in_array($scheme, ['http', 'https'], true) || $host === '' || isset($parts['user']) || isset($parts['pass'])) {
            return null;
        }

        if ($host === 'localhost' || str_ends_with($host, '.localhost') || $host === self::appHost()) {
            return null;
        }

        $addresses = filter_var($host, FILTER_VALIDATE_IP) !== false ? [$host] : ($this->resolver)($host);
        if ($addresses === [] || array_filter($addresses, fn (string $ip): bool => ! self::isPublic($ip)) !== []) {
            return null;
        }

        $port = $parts['port'] ?? ($scheme === 'https' ? 443 : 80);
        $pinned = str_contains($addresses[0], ':') ? "[{$addresses[0]}]" : $addresses[0];

        return "{$host}:{$port}:{$pinned}";
    }

    public static function isPublic(string $ip): bool
    {
        $binary = @inet_pton($ip);
        if ($binary === false) {
            return false;
        }

        // IPv4 carried inside IPv6 (mapped, NAT64, 6to4) is judged as the IPv4 it carries.
        if (strlen($binary) === 16) {
            $embedded = match (true) {
                str_starts_with($binary, str_repeat("\0", 10)."\xff\xff") => substr($binary, 12, 4),
                str_starts_with($binary, "\x00\x64\xff\x9b".str_repeat("\0", 8)) => substr($binary, 12, 4),
                str_starts_with($binary, "\x20\x02") => substr($binary, 2, 4),
                default => null,
            };

            if ($embedded !== null) {
                return self::isPublic((string) inet_ntop($embedded));
            }
        }

        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
            return false;
        }

        foreach (self::BLOCKED as $cidr) {
            if (self::inCidr($binary, $cidr)) {
                return false;
            }
        }

        return true;
    }

    private static function inCidr(string $binary, string $cidr): bool
    {
        [$network, $bits] = explode('/', $cidr);
        $net = inet_pton($network);
        if ($net === false || strlen($net) !== strlen($binary)) {
            return false;
        }

        $bits = (int) $bits;
        $whole = intdiv($bits, 8);
        if (substr($binary, 0, $whole) !== substr($net, 0, $whole)) {
            return false;
        }

        $rest = $bits % 8;
        if ($rest === 0) {
            return true;
        }

        $mask = (0xFF << (8 - $rest)) & 0xFF;

        return (ord($binary[$whole]) & $mask) === (ord($net[$whole]) & $mask);
    }

    /** @param  list<string>  $accept */
    private static function typeMatches(string $type, array $accept): bool
    {
        foreach ($accept as $wanted) {
            if ($wanted === '*/*' || $wanted === $type || (str_ends_with($wanted, '/*') && str_starts_with($type, substr($wanted, 0, -1)))) {
                return true;
            }
        }

        return false;
    }

    /**
     * One hop, pinned to the checked address. The answer is written to a temporary file and
     * the download stops once it passes the cap, so a huge answer never fills memory.
     *
     * @param  list<string>  $accept
     * @return array{0: int, 1: ResponseInterface, 2: string, 3: bool}|null status, headers, body, whether it was cut short
     */
    private function request(string $url, string $target, array $accept, int $maxBytes): ?array
    {
        // A path, not a handle: Guzzle closes a handle it is given when it is done with it.
        $sink = (string) tempnam(sys_get_temp_dir(), 'ghar-fetch-');
        $headers = null;
        $cut = false;

        try {
            $response = Http::withOptions([
                'allow_redirects' => false,
                'connect_timeout' => self::CONNECT_TIMEOUT_SECONDS,
                'timeout' => self::TIMEOUT_SECONDS,
                'curl' => [CURLOPT_RESOLVE => [$target]],
                'sink' => $sink,
                'on_headers' => function (ResponseInterface $answer) use (&$headers): void {
                    $headers = $answer;
                },
                'progress' => function (int|float $expected, int|float $received) use ($maxBytes, &$cut): void {
                    if ($received > $maxBytes) {
                        $cut = true;
                        throw new OverflowException('Answer is larger than the cap.');
                    }
                },
            ])
                ->withHeaders(['User-Agent' => self::USER_AGENT, 'Accept' => implode(', ', $accept)])
                ->get($url);
            $headers ??= $response->toPsrResponse();
        } catch (Throwable) {
            // Stopping at the cap ends the transfer with an error; what arrived is still usable.
            if (! $cut || $headers === null) {
                @unlink($sink);

                return null;
            }
        }

        $body = (string) @file_get_contents($sink, false, null, 0, $maxBytes + 1);
        @unlink($sink);

        // A faked client answers without writing to the sink.
        if ($body === '' && isset($response)) {
            $body = $response->body();
        }

        return [$headers->getStatusCode(), $headers, $body, $cut];
    }

    /** @return list<string> */
    private static function resolve(string $host): array
    {
        $v4 = gethostbynamel($host) ?: [];
        $v6 = array_column(@dns_get_record($host, DNS_AAAA) ?: [], 'ipv6');

        return array_values(array_unique([...$v4, ...$v6]));
    }

    private static function appHost(): string
    {
        return strtolower((string) parse_url((string) config('app.url'), PHP_URL_HOST));
    }
}
