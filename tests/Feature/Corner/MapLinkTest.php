<?php

namespace Tests\Feature\Corner;

use App\MiniApps\Corner\Support\MapLink;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class MapLinkTest extends TestCase
{
    /** @return array<string, array{0: string, 1: ?string}> link => its place's name when the page says nothing */
    public static function links(): array
    {
        return [
            'a place link with a name and a camera position' => ['https://maps.example.com/maps/place/Lalbagh+Botanical+Garden/@12.9507,77.5848,17z/data=!3m1', 'Lalbagh Botanical Garden'],
            'a place link with only a name' => ['https://maps.example.com/maps/place/Cubbon+Park/data=!4m2!3m1!1s0x0:0x1', 'Cubbon Park'],
            'a search for coordinates' => ['https://maps.example.com/?q=12.9716,77.5946', null],
            'an encoded comma' => ['https://maps.example.com/search?query=-33.8568%2C151.2153', null],
            'an ll parameter' => ['https://maps.example.net/?ll=40.748400,-73.985700&z=16', null],
            'mlat and mlon' => ['https://www.openmap.example/?mlat=51.5007&mlon=-0.1246#map=17/51.5007/-0.1246', null],
            'a map fragment' => ['https://www.openmap.example/#map=15/48.8584/2.2945', null],
        ];
    }

    #[DataProvider('links')]
    public function test_a_map_link_is_a_place(string $url, ?string $name): void
    {
        $this->assertSame($name, MapLink::placeName($url, ['title' => null, 'url' => $url]));
        $this->assertSame('Lalbagh', MapLink::placeName($url, ['title' => 'Lalbagh · Mavalli, Bengaluru', 'url' => $url]));
    }

    /** @return array<string, array{0: string}> */
    public static function notMaps(): array
    {
        return [
            'a video' => ['https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
            'a film' => ['https://watch.plex.tv/movie/the-man-from-earth'],
            'a search that is only words' => ['https://search.example.com/find?q=lakes+near+me'],
            'a latitude off the globe' => ['https://maps.example.com/?q=95.1,77.6'],
            'a longitude off the globe' => ['https://maps.example.com/?q=12.9,190.5'],
        ];
    }

    #[DataProvider('notMaps')]
    public function test_any_other_link_is_not_a_place_and_keeps_its_own_title(string $url): void
    {
        $this->assertNull(MapLink::placeName($url, ['title' => 'Song · Artist', 'url' => $url]));
    }

    public function test_a_short_link_is_a_place_by_where_it_landed(): void
    {
        $landed = 'https://maps.example.com/maps/place/Park%27s+Inn/@33.57,-98.11,10z';

        $this->assertSame("Park's Inn", MapLink::placeName('https://maps.example.com/s/park', ['title' => null, 'url' => $landed]));
        $this->assertNull(MapLink::placeName('https://maps.example.com/s/park', ['title' => null, 'url' => 'https://maps.example.com/s/park']));
    }

    public function test_a_page_titled_only_with_the_map_sites_name_leaves_the_name_to_the_link(): void
    {
        $url = 'https://maps.example.com/maps/place/Cubbon+Park/@12.97,77.59,15z';

        $this->assertSame('Cubbon Park', MapLink::placeName($url, ['title' => 'Maps', 'url' => $url]));
    }
}
