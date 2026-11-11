<?php

namespace App\MiniApps\Corner\Support;

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
}
