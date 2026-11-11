<?php

namespace App\Shell\Support;

use InvalidArgumentException;

/**
 * Parses TRUSTED_PROXIES: a comma-separated list of CIDRs, IPs and the keywords
 * `private` (loopback and RFC1918/ULA ranges, i.e. a reverse proxy on the same
 * host or Docker network), `cloudflare` (its published edge ranges) and `*`.
 *
 * Read by config/trustedproxy.php for Laravel and by `ghar:proxy-config` for
 * nginx, so the two lists can't drift.
 */
final class TrustedProxies
{
    public const PRIVATE_RANGES = [
        '127.0.0.0/8',
        '10.0.0.0/8',
        '172.16.0.0/12',
        '192.168.0.0/16',
        '::1/128',
        'fc00::/7',
    ];

    // https://www.cloudflare.com/ips/ — update when Cloudflare does.
    public const CLOUDFLARE_RANGES = [
        '173.245.48.0/20',
        '103.21.244.0/22',
        '103.22.200.0/22',
        '103.31.4.0/22',
        '141.101.64.0/18',
        '108.162.192.0/18',
        '190.93.240.0/20',
        '188.114.96.0/20',
        '197.234.240.0/22',
        '198.41.128.0/17',
        '162.158.0.0/15',
        '104.16.0.0/13',
        '104.24.0.0/14',
        '172.64.0.0/13',
        '131.0.72.0/22',
        '2400:cb00::/32',
        '2606:4700::/32',
        '2803:f800::/32',
        '2405:b500::/32',
        '2405:8100::/32',
        '2a06:98c0::/29',
        '2c0f:f248::/32',
    ];

    public const DEFAULT = 'private';

    /** @return list<string>|'*' */
    public static function parse(?string $value): array|string
    {
        $entries = array_values(array_filter(array_map(
            'trim',
            explode(',', strtolower(trim((string) $value) ?: self::DEFAULT)),
        ), fn (string $entry): bool => $entry !== ''));

        if (in_array('*', $entries, true)) {
            return '*';
        }

        $proxies = [];
        foreach ($entries as $entry) {
            $proxies = [...$proxies, ...match (true) {
                $entry === 'private' => self::PRIVATE_RANGES,
                $entry === 'cloudflare' => self::CLOUDFLARE_RANGES,
                self::isAddressOrRange($entry) => [$entry],
                default => throw new InvalidArgumentException(
                    "TRUSTED_PROXIES: '{$entry}' is not an IP, a CIDR range, 'private', 'cloudflare' or '*'."
                ),
            }];
        }

        return array_values(array_unique($proxies));
    }

    public static function includesCloudflare(?string $value): bool
    {
        return in_array('cloudflare', array_map('trim', explode(',', strtolower((string) $value))), true);
    }

    private static function isAddressOrRange(string $entry): bool
    {
        [$ip, $bits] = array_pad(explode('/', $entry, 2), 2, null);

        if (filter_var($ip, FILTER_VALIDATE_IP) === false) {
            return false;
        }

        if ($bits === null) {
            return true;
        }

        $max = str_contains($ip, ':') ? 128 : 32;

        return ctype_digit($bits) && (int) $bits <= $max;
    }
}
