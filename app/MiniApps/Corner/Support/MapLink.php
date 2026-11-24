<?php

namespace App\MiniApps\Corner\Support;

/**
 * Tells a link to a place on a map from a link to anything else, and names the place. Recognising
 * how map sites write places into their links is unavoidable here, so the shapes live in one
 * table below and nowhere else; no site is named anywhere a person sees.
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
        self::PLACE_PATH,
        '#[?&](?:q|query|name)=([^&]+)#i',
    ];

    private const PLACE_PATH = '#/maps/place/([^/@?]+)#';

    /** How a map page titles a place: its name, then where it is. */
    private const TITLE_SEPARATOR = ' · ';

    private const BARE = '/^\s*(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/';

    /**
     * The place a pasted link is a map of, or null when it is a link to anything else. A search
     * query alone (`?q=`) is not enough: plenty of pages that aren't maps have one.
     *
     * @return array{label: ?string, lat: ?float, lng: ?float}|null
     */
    private static function place(string $url): ?array
    {
        $found = self::fromUrl($url);

        return $found['lat'] !== null || ($found['label'] !== null && preg_match(self::PLACE_PATH, $url) === 1)
            ? $found
            : null;
    }

    /**
     * What a previewed map link's place is called, or null when the link isn't a map. A short
     * link only shows it is a map once followed, and the preview already followed it. A page
     * title without the separator is the map site's own name, not the place's, so a pin with
     * no name in its link goes by the link itself.
     *
     * @param  array{title: ?string, url: string}  $read  what LinkPreview found
     */
    public static function placeName(string $url, array $read): ?string
    {
        $place = self::place($url) ?? self::place($read['url']);
        if ($place === null) {
            return null;
        }

        $parts = explode(self::TITLE_SEPARATOR, $read['title'] ?? '', 2);

        return (count($parts) === 2 ? self::text($parts[0]) : null) ?? $place['label'] ?? $url;
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
