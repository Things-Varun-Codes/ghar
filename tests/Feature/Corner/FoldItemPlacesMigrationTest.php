<?php

namespace Tests\Feature\Corner;

use App\MiniApps\Corner\Support\LinkKey;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\Feature\Corner\Concerns\MakesCornerLists;
use Tests\TestCase;

/** Runs the place-column upgrade over hand-written rows; down() brings the columns back for them. */
class FoldItemPlacesMigrationTest extends TestCase
{
    use MakesCornerLists;
    use RefreshDatabase;

    private const PIN = 'https://www.google.com/maps/search/?api=1&query=';

    private object $migration;

    private int $listId;

    private int $userId;

    protected function setUp(): void
    {
        parent::setUp();

        $this->migration = require database_path('migrations/our-shelf/2026_11_25_100000_fold_item_places_into_links_and_notes.php');
        $this->migration->down();

        $this->listId = $this->places()->id;
        $this->userId = User::factory()->create()->id;
    }

    /** @param  array<string, mixed>  $columns */
    private function row(array $columns): int
    {
        return DB::table('corner_items')->insertGetId($columns + [
            'list_id' => $this->listId,
            'added_by_user_id' => $this->userId,
            'added_at' => now(),
            'title' => 'A place',
        ]);
    }

    private function after(int $id): object
    {
        return DB::table('corner_items')->where('id', $id)->first();
    }

    public function test_every_kind_of_place_moves_into_the_link_or_the_notes(): void
    {
        $shortLink = 'https://maps.app.goo.gl/abc';
        $onlyMapLink = $this->row(['title' => 'Market', 'location_url' => $shortLink, 'location_label' => 'Market']);
        $upgraded = $this->row([
            'title' => 'Blue Door Cafe', 'location_label' => 'Blue Door Cafe', 'place_id' => 'dev-place-0',
            'lat' => 9.9658, 'lng' => 76.2421, 'address' => '12 Fort Road, Kochi',
        ]);
        $websiteAndPin = $this->row([
            'title' => 'Pottery cafe', 'notes' => 'Keep the bowl.', 'url' => 'https://example.org/pottery',
            'location_url' => 'https://maps.example.com/maps/place/Clay+Studio/@12.97,77.64,17z',
            'location_label' => 'Clay Studio', 'lat' => 12.97, 'lng' => 77.64, 'address' => '100 Feet Road',
        ]);
        $websiteAndPoint = $this->row(['title' => 'Lake', 'url' => 'https://example.org/lake', 'lat' => 12.98, 'lng' => 77.62]);
        $geo = $this->row(['title' => 'Lalbagh', 'location_url' => 'geo:12.95,77.58?q=Lalbagh', 'location_label' => 'Lalbagh']);
        $typed = $this->row(['title' => 'Bakery', 'location_label' => 'The bakery on 4th Cross']);
        $plain = $this->row(['title' => 'Picnic', 'notes' => 'Bring a mat', 'url' => 'https://example.org/picnic']);

        $this->migration->up();

        foreach (['location_label', 'location_url', 'place_id', 'lat', 'lng', 'address'] as $column) {
            $this->assertFalse(Schema::hasColumn('corner_items', $column), $column);
        }

        $row = $this->after($onlyMapLink);
        $this->assertSame($shortLink, $row->url);
        $this->assertSame(LinkKey::for($shortLink), $row->url_key);
        $this->assertSame(LinkKey::siteOf($shortLink), $row->site_name);
        $this->assertNull($row->notes);

        $row = $this->after($upgraded);
        $this->assertSame(self::PIN.'9.9658,76.2421', $row->url);
        $this->assertSame('12 Fort Road, Kochi', $row->notes);

        $row = $this->after($websiteAndPin);
        $this->assertSame('https://example.org/pottery', $row->url);
        $this->assertSame("Keep the bowl.\n\nhttps://maps.example.com/maps/place/Clay+Studio/@12.97,77.64,17z\nClay Studio\n100 Feet Road", $row->notes);

        $this->assertSame(self::PIN.'12.98,77.62', $this->after($websiteAndPoint)->notes);

        $row = $this->after($geo);
        $this->assertNull($row->url);
        $this->assertSame('geo:12.95,77.58?q=Lalbagh', $row->notes);

        $this->assertSame('The bakery on 4th Cross', $this->after($typed)->notes);

        $row = $this->after($plain);
        $this->assertSame('Bring a mat', $row->notes);
        $this->assertSame('https://example.org/picnic', $row->url);
    }

    public function test_a_moved_link_already_in_the_list_keeps_the_link_without_its_key(): void
    {
        $link = 'https://maps.app.goo.gl/same';
        $this->row(['title' => 'First', 'url' => $link, 'url_key' => LinkKey::for($link)]);
        $twin = $this->row(['title' => 'Second', 'location_url' => $link]);
        $first = $this->row(['title' => 'Lake one', 'lat' => 12.98, 'lng' => 77.62]);
        $second = $this->row(['title' => 'Lake two', 'lat' => 12.98, 'lng' => 77.62]);

        $this->migration->up();

        $this->assertSame($link, $this->after($twin)->url);
        $this->assertNull($this->after($twin)->url_key);
        $this->assertNotNull($this->after($first)->url_key);
        $this->assertSame($this->after($first)->url, $this->after($second)->url);
        $this->assertNull($this->after($second)->url_key);
    }

    public function test_notes_stay_short_enough_to_be_saved_again(): void
    {
        $id = $this->row(['notes' => str_repeat('a', 1990), 'location_label' => 'Somewhere else entirely']);

        $this->migration->up();

        $this->assertSame(2000, mb_strlen($this->after($id)->notes));
    }
}
