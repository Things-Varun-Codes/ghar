<?php

namespace App\MiniApps\Corner\Support;

/**
 * One key per page, however the link was written: the scheme and host in lower case, no
 * fragment, no default port, no trailing slash, no tracking parameters, the rest of the query
 * sorted. Two people pasting the same page into one list get "already in this list".
 */
final class LinkKey
{
    private const TRACKING = '/^(utm_[a-z]+|fbclid|gclid|mc_cid|mc_eid|igshid|si)$/i';

    public static function for(string $url): ?string
    {
        $normal = self::normalise($url);

        return $normal === null ? null : hash('sha256', $normal);
    }

    public static function normalise(string $url): ?string
    {
        $parts = parse_url(trim($url));
        $scheme = strtolower($parts['scheme'] ?? '');
        $host = strtolower($parts['host'] ?? '');

        if (! in_array($scheme, ['http', 'https'], true) || $host === '') {
            return null;
        }

        $port = $parts['port'] ?? null;
        $port = ($port === null || ($scheme === 'http' && $port === 80) || ($scheme === 'https' && $port === 443))
            ? ''
            : ':'.$port;

        $path = rtrim($parts['path'] ?? '', '/');

        parse_str($parts['query'] ?? '', $query);
        $query = array_filter(
            $query,
            fn (mixed $value, int|string $key): bool => preg_match(self::TRACKING, (string) $key) !== 1,
            ARRAY_FILTER_USE_BOTH,
        );
        ksort($query);
        $query = $query === [] ? '' : '?'.http_build_query($query);

        return "{$scheme}://{$host}{$port}{$path}{$query}";
    }

    /** The host a reader recognises: "example.com" for https://www.example.com/a. */
    public static function siteOf(string $url): ?string
    {
        $host = strtolower((string) parse_url(trim($url), PHP_URL_HOST));

        if ($host === '') {
            return null;
        }

        return mb_substr(preg_replace('/^www\./', '', $host) ?? $host, 0, 120);
    }
}
