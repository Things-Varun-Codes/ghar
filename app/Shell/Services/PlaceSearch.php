<?php

namespace App\Shell\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Place search on OpenStreetMap through a Photon server, for installs without a Google Maps key.
 * Asked from here rather than the browser, so Photon never sees who in the household typed what.
 * Nominatim's usage policy forbids search-as-you-type, which is why this is Photon.
 */
class PlaceSearch
{
    private const LIMIT = 6;

    /** @return list<array{place_id: string, name: string, address: string, lat: float, lng: float}> */
    public function search(string $query): array
    {
        $query = trim($query);

        // Cached so the same few letters from two people, or a retyped search, cost one request.
        $found = Cache::get($key = 'places:photon:'.sha1(mb_strtolower($query)));
        if (is_array($found)) {
            return $found;
        }

        try {
            $response = Http::timeout(5)
                ->acceptJson()
                ->get(rtrim((string) config('services.photon.url'), '/').'/api/', ['q' => $query, 'limit' => self::LIMIT]);
        } catch (Throwable) {
            return [];
        }

        if (! $response->successful()) {
            return [];
        }

        $features = $response->json('features');
        $found = [];
        // OSM often holds one park as both a way and a relation; one row per name and address.
        foreach (is_array($features) ? $features : [] as $feature) {
            $place = self::place($feature);
            if ($place !== null) {
                $found[$place['name']."\n".$place['address']] ??= $place;
            }
        }
        $found = array_values($found);
        Cache::put($key, $found, now()->addDay());

        return $found;
    }

    /** @return array{place_id: string, name: string, address: string, lat: float, lng: float}|null */
    private static function place(mixed $feature): ?array
    {
        $p = is_array($feature) ? ($feature['properties'] ?? null) : null;
        $coords = is_array($feature) ? ($feature['geometry']['coordinates'] ?? null) : null;
        if (! is_array($p) || ! is_array($coords) || ! is_numeric($coords[0] ?? null) || ! is_numeric($coords[1] ?? null)
            || ! is_string($p['osm_type'] ?? null) || ! is_numeric($p['osm_id'] ?? null)) {
            return null;
        }

        $str = fn (string $k): ?string => is_string($p[$k] ?? null) && trim($p[$k]) !== '' ? trim($p[$k]) : null;
        $street = trim(($str('housenumber') ?? '').' '.($str('street') ?? '')) ?: null;
        $name = $str('name') ?? $street ?? $str('city');
        if ($name === null) {
            return null;
        }

        $parts = array_unique(array_filter([$street, $str('district'), $str('city'), $str('state'), $str('country')]));

        return [
            'place_id' => 'osm:'.$p['osm_type'].$p['osm_id'],
            'name' => mb_substr($name, 0, 255),
            'address' => mb_substr(implode(', ', $parts), 0, 255),
            'lat' => (float) $coords[1],
            'lng' => (float) $coords[0],
        ];
    }
}
