<?php

namespace App\MiniApps\Corner\Support;

use App\Shell\Support\Http\SafeFetcher;
use Illuminate\Support\Facades\Cache;

/**
 * Reads where a pasted location points: a map link, a geo: address, bare coordinates, or just
 * the name of a place. Recognising how map sites write coordinates into their links is
 * unavoidable here, so the shapes live in one table below and nowhere else; no site is named
 * anywhere a person sees.
 */
final class MapLink
{
    /**
     * Patterns over a whole map link; the first two groups are latitude and longitude.
     */
    private const COORDINATE_PATTERNS = [
        '#!3d(-?\d{1,2}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)#',
        '#@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)#',
        '#[?&](?:q|query|ll|sll|daddr|destination|center|coordinate)=(-?\d{1,2}\.\d+)(?:,|%2C)\s*(-?\d{1,3}\.\d+)#i',
        '#[?&]mlat=(-?\d{1,2}(?:\.\d+)?)&mlon=(-?\d{1,3}(?:\.\d+)?)#i',
        '#\#map=\d+/(-?\d{1,2}(?:\.\d+)?)/(-?\d{1,3}(?:\.\d+)?)#',
    ];

    /** Patterns whose first group names the place. */
    private const LABEL_PATTERNS = [
        '#/place/([^/@?]+)#',
        '#[?&](?:q|query|name)=([^&]+)#i',
    ];

    private const FOLLOWED_SECONDS = 86400;

    private const UNFOLLOWED_SECONDS = 600;

    private const BARE = '/^\s*(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/';

    private const GEO = '#^geo:(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)(?:[;,][^?]*)?(?:\?(.*))?$#i';

    /**
     * @return array{label: ?string, url: ?string, lat: ?float, lng: ?float}
     */
    public static function read(string $input, ?SafeFetcher $fetcher = null): array
    {
        $input = trim($input);
        $none = ['label' => null, 'url' => null, 'lat' => null, 'lng' => null];

        if ($input === '') {
            return $none;
        }

        if (preg_match(self::BARE, $input, $m) === 1) {
            return self::point($m[1], $m[2]) + ['label' => null, 'url' => null];
        }

        if (preg_match(self::GEO, $input, $m) === 1) {
            parse_str($m[3] ?? '', $query);
            $label = is_string($query['q'] ?? null) ? preg_replace('/^[-\d.,\s]+\(?|\)$/', '', $query['q']) : null;

            return ['label' => self::text($label), 'url' => $input] + self::point($m[1], $m[2]);
        }

        if (! ItemRules::isWebUrl($input)) {
            return ['label' => mb_substr($input, 0, 255)] + $none;
        }

        $found = self::fromUrl($input);

        // A short link only says where it goes once it is followed.
        if ($found['lat'] === null && $fetcher !== null) {
            $final = self::followed($input, $fetcher);
            if ($final !== null && $final !== $input) {
                $expanded = self::fromUrl($final);
                $found = [
                    'label' => $found['label'] ?? $expanded['label'],
                    'lat' => $expanded['lat'],
                    'lng' => $expanded['lng'],
                ];
            }
        }

        return ['url' => mb_substr($input, 0, 2048)] + $found;
    }

    /** Remembered, so saving or editing the same pasted link doesn't walk its redirects again. */
    private static function followed(string $url, SafeFetcher $fetcher): ?string
    {
        $key = 'corner:map-link:'.sha1($url);

        $cached = Cache::get($key);
        if (is_array($cached)) {
            return $cached['final'];
        }

        $final = $fetcher->finalUrl($url);
        Cache::put($key, ['final' => $final], $final !== null ? self::FOLLOWED_SECONDS : self::UNFOLLOWED_SECONDS);

        return $final;
    }

    /** @return array{label: ?string, lat: ?float, lng: ?float} */
    private static function fromUrl(string $url): array
    {
        $point = ['lat' => null, 'lng' => null];
        foreach (self::COORDINATE_PATTERNS as $pattern) {
            if (preg_match($pattern, $url, $m) === 1) {
                $point = self::point($m[1], $m[2]);
                if ($point['lat'] !== null) {
                    break;
                }
            }
        }

        $label = null;
        foreach (self::LABEL_PATTERNS as $pattern) {
            if (preg_match($pattern, $url, $m) === 1) {
                $candidate = self::text(urldecode(str_replace('+', ' ', $m[1])));
                if ($candidate !== null && preg_match(self::BARE, $candidate) !== 1) {
                    $label = $candidate;
                    break;
                }
            }
        }

        return ['label' => $label] + $point;
    }

    /** @return array{lat: ?float, lng: ?float} */
    private static function point(string $lat, string $lng): array
    {
        $lat = (float) $lat;
        $lng = (float) $lng;

        if (abs($lat) > 90 || abs($lng) > 180) {
            return ['lat' => null, 'lng' => null];
        }

        return ['lat' => round($lat, 7), 'lng' => round($lng, 7)];
    }

    private static function text(?string $text): ?string
    {
        $text = ItemRules::trimmed($text);

        return $text === null ? null : mb_substr($text, 0, 255);
    }
}
