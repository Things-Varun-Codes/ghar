<?php

namespace Tests\Feature\Corner;

use App\MiniApps\Corner\Services\SafeFetcher;
use App\MiniApps\Corner\Support\MapLink;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class MapLinkTest extends TestCase
{
    private function fetcher(): SafeFetcher
    {
        return new SafeFetcher(fn (): array => ['93.184.216.34']);
    }

    /**
     * @return array<string, array{0: string, 1: array{label: ?string, url: ?string, lat: ?float, lng: ?float}}>
     */
    public static function inputs(): array
    {
        $link = fn (string $url, ?string $label, ?float $lat, ?float $lng): array => [$url, ['label' => $label, 'url' => $url, 'lat' => $lat, 'lng' => $lng]];

        return [
            'a place link with a name and a camera position' => $link(
                'https://maps.example.com/maps/place/Lalbagh+Botanical+Garden/@12.9507,77.5848,17z/data=!3m1',
                'Lalbagh Botanical Garden', 12.9507, 77.5848,
            ),
            'the pin wins over the camera' => $link(
                'https://maps.example.com/maps/place/Cubbon+Park/@12.9700,77.5900,15z/data=!4m6!3m5!3d12.9763!4d77.5929',
                'Cubbon Park', 12.9763, 77.5929,
            ),
            'a search for coordinates' => $link('https://maps.example.com/?q=12.9716,77.5946', null, 12.9716, 77.5946),
            'an encoded comma' => $link('https://maps.example.com/search?query=-33.8568%2C151.2153', null, -33.8568, 151.2153),
            'an ll parameter' => $link('https://maps.example.net/?ll=40.748400,-73.985700&z=16', null, 40.7484, -73.9857),
            'mlat and mlon' => $link('https://www.openmap.example/?mlat=51.5007&mlon=-0.1246#map=17/51.5007/-0.1246', null, 51.5007, -0.1246),
            'a map fragment' => $link('https://www.openmap.example/#map=15/48.8584/2.2945', null, 48.8584, 2.2945),
            'geo: with a name' => ['geo:12.9507,77.5848?q=12.9507,77.5848(Lalbagh)', ['label' => 'Lalbagh', 'url' => 'geo:12.9507,77.5848?q=12.9507,77.5848(Lalbagh)', 'lat' => 12.9507, 'lng' => 77.5848]],
            'geo: without a query' => ['geo:-33.8568,151.2153', ['label' => null, 'url' => 'geo:-33.8568,151.2153', 'lat' => -33.8568, 'lng' => 151.2153]],
            'geo: with an altitude' => ['geo:12.97,77.64,920', ['label' => null, 'url' => 'geo:12.97,77.64,920', 'lat' => 12.97, 'lng' => 77.64]],
            'bare coordinates with a comma' => ['12.97, 77.64', ['label' => null, 'url' => null, 'lat' => 12.97, 'lng' => 77.64]],
            'bare coordinates with a space' => [' 12.97 77.64 ', ['label' => null, 'url' => null, 'lat' => 12.97, 'lng' => 77.64]],
            'negative bare coordinates' => ['-33.85678, -151.21529', ['label' => null, 'url' => null, 'lat' => -33.85678, 'lng' => -151.21529]],
            'a latitude off the globe' => ['95.1, 77.6', ['label' => null, 'url' => null, 'lat' => null, 'lng' => null]],
            'a longitude off the globe' => ['12.9, 190.5', ['label' => null, 'url' => null, 'lat' => null, 'lng' => null]],
            'plain text' => ['The bakery on 4th Cross', ['label' => 'The bakery on 4th Cross', 'url' => null, 'lat' => null, 'lng' => null]],
            'a street address' => ['12 Fort Road, Kochi', ['label' => '12 Fort Road, Kochi', 'url' => null, 'lat' => null, 'lng' => null]],
            'nothing' => ['   ', ['label' => null, 'url' => null, 'lat' => null, 'lng' => null]],
        ];
    }

    /** @param  array{label: ?string, url: ?string, lat: ?float, lng: ?float}  $expected */
    #[DataProvider('inputs')]
    public function test_it_reads_where_a_location_points(string $input, array $expected): void
    {
        Http::fake();

        $this->assertEquals($expected, MapLink::read($input, $this->fetcher()));
        // Every one of these says where it is without being followed.
        Http::assertNothingSent();
    }

    public function test_a_short_link_is_followed_to_where_it_goes(): void
    {
        Http::fake([
            'short.example/*' => Http::response('', 302, ['Location' => 'https://maps.example.com/maps/place/Nandi+Hills/@13.3702,77.6835,14z']),
            'maps.example.com/*' => Http::response('<html></html>', 200, ['Content-Type' => 'text/html']),
        ]);

        $this->assertEquals([
            'label' => 'Nandi Hills',
            'url' => 'https://short.example/abc123',
            'lat' => 13.3702,
            'lng' => 77.6835,
        ], MapLink::read('https://short.example/abc123', $this->fetcher()));
    }

    public function test_a_map_link_with_only_a_name_keeps_the_name_and_takes_coordinates_from_where_it_lands(): void
    {
        Http::fake([
            'maps.example.com/?q=*' => Http::response('', 302, ['Location' => 'https://maps.example.com/maps/place/Somewhere+Else/@12.9563,77.5730,17z']),
            'maps.example.com/maps/*' => Http::response('<html></html>', 200, ['Content-Type' => 'text/html']),
        ]);

        $this->assertEquals([
            'label' => 'Vidyarthi Bhavan',
            'url' => 'https://maps.example.com/?q=Vidyarthi+Bhavan',
            'lat' => 12.9563,
            'lng' => 77.573,
        ], MapLink::read('https://maps.example.com/?q=Vidyarthi+Bhavan', $this->fetcher()));
    }

    public function test_a_short_link_that_cannot_be_followed_is_kept_as_a_link(): void
    {
        Http::fake(fn () => throw new ConnectionException('timed out'));

        $this->assertEquals(
            ['label' => null, 'url' => 'https://short.example/dead', 'lat' => null, 'lng' => null],
            MapLink::read('https://short.example/dead', $this->fetcher()),
        );

        // A short link to an inside address isn't followed at all.
        Http::fake();
        $inside = new SafeFetcher(fn (): array => ['10.0.0.2']);
        $this->assertEquals(
            ['label' => null, 'url' => 'https://short.example/inside', 'lat' => null, 'lng' => null],
            MapLink::read('https://short.example/inside', $inside),
        );
        Http::assertNothingSent();
    }

    public function test_without_a_fetcher_nothing_is_followed(): void
    {
        Http::fake();

        $this->assertEquals(
            ['label' => null, 'url' => 'https://short.example/abc', 'lat' => null, 'lng' => null],
            MapLink::read('https://short.example/abc'),
        );
        Http::assertNothingSent();
    }
}
