<?php

namespace App\MiniApps\Corner\Support;

use Psr\Http\Message\RequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\UriInterface;
use RuntimeException;

/**
 * Exact-domain or dot-suffix matching on the parsed host. A substring test can't tell
 * open.spotify.com from open.spotify.com.evil.example.
 */
class HostAllowlist
{
    /** @param  list<string>  $allowedDomains */
    public static function matches(string $url, array $allowedDomains): bool
    {
        $parts = parse_url($url);

        if ($parts === false) {
            return false;
        }

        $scheme = $parts['scheme'] ?? null;
        if (! in_array($scheme, ['http', 'https'], true)) {
            return false;
        }

        $host = $parts['host'] ?? '';
        if ($host === '') {
            return false;
        }

        $host = strtolower($host);

        foreach ($allowedDomains as $domain) {
            if ($host === $domain || str_ends_with($host, '.'.$domain)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Guzzle redirect options that hold every hop to the same allowlist. Checking only the
     * first URL isn't enough: a redirect from an allowed host can point at an internal address.
     *
     * @param  list<string>  $allowedDomains
     * @return array{max: int, protocols: list<string>, on_redirect: callable}
     */
    public static function redirectOptions(array $allowedDomains): array
    {
        return [
            'max' => 3,
            'protocols' => ['https'],
            'on_redirect' => function (RequestInterface $request, ResponseInterface $response, UriInterface $uri) use ($allowedDomains): void {
                if (! self::matches((string) $uri, $allowedDomains)) {
                    throw new RuntimeException('Refused a redirect to a host outside the allowlist: '.$uri->getHost());
                }
            },
        ];
    }
}
