<?php

namespace Database\Seeders\DevData;

use App\MiniApps\Corner\Actions\SwitchDoneMode;
use App\MiniApps\Corner\Models\CornerList;
use App\MiniApps\Corner\Models\Item;
use App\MiniApps\Corner\Support\LinkKey;
use App\MiniApps\Corner\Support\PictureCache;
use App\Shell\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Corner lists. Songs, Movies, Places and Activities look the way the upgrade leaves an
 * install that had them: no maker, and every item remembers its old type and id, so History's
 * old-style links are exercised. Four more lists were made by people in the household, to
 * cover who may change and delete a list, icons from the full set, both done marks, a long
 * name, an empty list and one that sends no notifications. Between them the items cover every
 * part an item can have, alone and together.
 *
 * Pictures are web addresses, as they are in a real household. Their bytes are put straight
 * into the picture cache, so pages show them without reaching the network.
 */
final class CornerData
{
    private const FILLER_SONGS = 54;

    /** Above every old id, as the upgrade leaves it, so an old id never names a new item. */
    private const FIRST_NEW_ID = 100;

    /** @var array<string, int> next old id per old type */
    private array $legacyIds = [];

    private int $pictureSeed = 0;

    /**
     * @return array<string, array{id: int, title: string, type: string, slug: string}> what moments can link to
     */
    public function seed(Household $h): array
    {
        DB::statement("select setval(pg_get_serial_sequence('corner_items', 'id'), ?)", [self::FIRST_NEW_ID - 1]);

        return [
            ...$this->songs($h),
            ...$this->movies($h),
            ...$this->places($h),
            ...$this->activities($h),
            ...$this->books($h),
            ...$this->restaurants($h),
            ...$this->boardGames($h),
            ...$this->weekendIdeas($h),
        ];
    }

    /**
     * Links with pictures and who made them, and a long tail without, past the 50-row page.
     *
     * @return array<string, array{id: int, title: string, type: string, slug: string}>
     */
    private function songs(Household $h): array
    {
        $list = CornerList::factory()->songs()->create(['created_at' => $h->daysAgo(365)]);

        // [title, author, adder, days ago added, loved by, loved days ago]
        $named = [
            ['Rain on the Tin Roof', 'The Monsoon Club', $h->ravi, 3, null, null],
            ['Kitchen Radio', 'Lata and the Lamps', $h->meera, 6, $h->admin, 2],
            ['Sunday Morning Chai', 'Old Courtyard', $h->admin, 9, $h->ravi, 5],
            ['Night Bus Home', 'Kabir and Friends', $h->kabir, 12, null, null],
            ['Grandfather Clock', 'The Long Hallway', $h->admin, 20, $h->meera, 14],
            ['Mango Season', 'Summer Holidays', $h->meera, 28, null, null],
            ['Paper Boats', 'Second Floor', $h->ravi, 35, $h->kabir, 30],
            ['Porch Lights', 'The Neighbours', $h->kabir, 44, null, null],
        ];

        $links = [];
        $songs = [];
        foreach ($named as $i => [$title, $author, $adder, $added, $lovedBy, $lovedAgo]) {
            $song = $this->song($h, $list, $i, $title, $author, $adder, $added, $lovedBy, $lovedAgo, withPicture: true);
            $songs[] = $song;
            $links[$i === 0 ? 'song' : "song-{$i}"] = $this->legacyLink($song, 'songs');
        }

        // Older than the named ones, so the first page reads naturally.
        for ($i = 0; $i < self::FILLER_SONGS; $i++) {
            $adder = $h->members()[$i % 4];
            $lovedBy = $i % 5 === 0 ? $h->members()[($i + 1) % 4] : null;

            $this->song(
                $h,
                $list,
                count($named) + $i,
                rtrim($h->faker->sentence(3), '.'),
                $h->faker->name(),
                $adder,
                50 + $i * 3,
                $lovedBy,
                $lovedBy ? 45 + $i * 3 : null,
                withPicture: false,
            );
        }

        // Songs is the per-person list: each person loves a song for themselves. The switch turns
        // every love above into that person's own mark, then a few songs gain more than one.
        app(SwitchDoneMode::class)($list, true);
        foreach ([[1, $h->meera, 1], [1, $h->kabir, 1], [2, $h->meera, 4], [4, $h->ravi, 10]] as [$index, $by, $daysAgo]) {
            DB::table('corner_item_marks')->insertOrIgnore([
                'item_id' => $songs[$index]->id,
                'user_id' => $by->id,
                'done_at' => $h->daysAgo($daysAgo),
            ]);
        }

        return $links;
    }

    private function song(
        Household $h,
        CornerList $list,
        int $index,
        string $title,
        string $author,
        User $adder,
        int $addedDaysAgo,
        ?User $lovedBy,
        ?int $lovedDaysAgo,
        bool $withPicture,
    ): Item {
        $streaming = $index % 3 === 2;
        $id = substr(hash('sha256', "dev-song-{$index}"), 0, $streaming ? 22 : 11);
        $url = $streaming ? "https://open.spotify.com/track/{$id}" : "https://www.youtube.com/watch?v={$id}";
        $picture = $streaming ? "https://i.scdn.co/image/{$id}" : "https://i.ytimg.com/vi/{$id}/hqdefault.jpg";

        return Item::factory()->create([
            'list_id' => $list->id,
            'title' => $title,
            'author' => $author,
            ...$this->linkTo($url),
            'image_url' => $withPicture ? $this->picture($picture, $title, 320, 320) : null,
            'added_by_user_id' => $adder->id,
            'added_at' => $h->daysAgo($addedDaysAgo),
            ...$this->legacy('corner.song'),
            ...$this->done($h, $lovedBy, $lovedDaysAgo),
        ]);
    }

    /**
     * Pictures without links (what the old poster lists held), some missing.
     *
     * @return array<string, array{id: int, title: string, type: string, slug: string}>
     */
    private function movies(Household $h): array
    {
        $list = CornerList::factory()->movies()->create(['created_at' => $h->daysAgo(364)]);

        // [title, adder, days ago added, watched by, watched days ago, has poster]
        $movies = [
            ['The Long Train South', $h->meera, 4, null, null, true],
            ['Tiger at the Gate', $h->kabir, 8, $h->ravi, 3, true],
            ['Three Weddings and a Flood', $h->admin, 15, $h->meera, 10, false],
            ['The Spice Merchant', $h->ravi, 21, null, null, true],
            ['Letters from the Hills', $h->admin, 33, $h->admin, 25, false],
            ['Robot Uncle', $h->kabir, 40, null, null, false],
            ['Harvest Moon', $h->meera, 55, $h->kabir, 50, true],
            ['A Very Loud Family', $h->ravi, 70, null, null, false],
        ];

        $links = [];
        foreach ($movies as $i => [$title, $adder, $added, $watchedBy, $watchedAgo, $hasPoster]) {
            $movie = Item::factory()->create([
                'list_id' => $list->id,
                'title' => $title,
                'image_url' => $hasPoster
                    ? $this->picture('https://images.example.com/posters/'.str($title)->slug().'.jpg', $title, 400, 600)
                    : null,
                'added_by_user_id' => $adder->id,
                'added_at' => $h->daysAgo($added),
                ...$this->legacy('corner.movie'),
                ...$this->done($h, $watchedBy, $watchedAgo),
            ]);

            $links[$i === 0 ? 'movie' : "movie-{$i}"] = $this->legacyLink($movie, 'movies');
        }

        return $links;
    }

    /**
     * Places as the upgrade leaves them: a map link to where they are, the address in the notes.
     *
     * @return array<string, array{id: int, title: string, type: string, slug: string}>
     */
    private function places(Household $h): array
    {
        $list = CornerList::factory()->places()->create(['created_at' => $h->daysAgo(363)]);

        // [title, address, lat, lng, adder, days ago added, visited by, visited days ago]
        $places = [
            ['Blue Door Cafe', '12 Fort Road, Kochi', 9.9658, 76.2421, $h->meera, 5, null, null],
            ['Hilltop Tea Estate', 'Estate Road, Munnar', 10.0889, 77.0595, $h->admin, 18, $h->ravi, 7],
            ['The Old Lighthouse', 'Beach Road, Alappuzha', 9.4981, 76.3388, $h->ravi, 26, null, null],
            ['Stepwell Museum', 'Heritage Lane, Ahmedabad', 23.0225, 72.5714, $h->kabir, 38, $h->admin, 31],
            ['Grandma\'s Bakery', '4 Market Street, Mysuru', 12.2958, 76.6394, $h->admin, 47, $h->meera, 42],
            ['River Rafting Camp', 'Camp Road, Rishikesh', 30.0869, 78.2676, $h->kabir, 60, null, null],
        ];

        $links = [];
        foreach ($places as $i => [$title, $address, $lat, $lng, $adder, $added, $visitedBy, $visitedAgo]) {
            $place = Item::factory()->create([
                'list_id' => $list->id,
                'title' => $title,
                ...$this->linkTo("https://www.google.com/maps/search/?api=1&query={$lat},{$lng}"),
                'site_name' => 'Google Maps',
                'notes' => $address,
                'added_by_user_id' => $adder->id,
                'added_at' => $h->daysAgo($added),
                ...$this->legacy('corner.place'),
                ...$this->done($h, $visitedBy, $visitedAgo),
            ]);

            $links[$i === 0 ? 'place' : "place-{$i}"] = $this->legacyLink($place, 'places');
        }

        return $links;
    }

    /**
     * Names only, some with notes.
     *
     * @return array<string, array{id: int, title: string, type: string, slug: string}>
     */
    private function activities(Household $h): array
    {
        $list = CornerList::factory()->activities()->create(['created_at' => $h->daysAgo(362)]);

        // [title, notes, adder, days ago added, done by, done days ago]
        $activities = [
            ['Teach Kabir to make dal', 'Start with the pressure cooker.', $h->meera, 2, null, null],
            ['Board game night', null, $h->kabir, 7, $h->admin, 1],
            ['Clear out the loft', 'Keep the old photo albums.', $h->admin, 11, null, null],
            ['Plant the balcony herbs', null, $h->ravi, 19, $h->meera, 12],
            ['Learn one card trick each', null, $h->kabir, 30, null, null],
            ['Cycle to the lake', 'Early, before it gets hot.', $h->ravi, 41, $h->kabir, 36],
        ];

        $links = [];
        foreach ($activities as $i => [$title, $notes, $adder, $added, $doneBy, $doneAgo]) {
            $activity = Item::factory()->create([
                'list_id' => $list->id,
                'title' => $title,
                'notes' => $notes,
                'added_by_user_id' => $adder->id,
                'added_at' => $h->daysAgo($added),
                ...$this->legacy('corner.activity'),
                ...$this->done($h, $doneBy, $doneAgo),
            ]);

            $links[$i === 0 ? 'activity' : "activity-{$i}"] = $this->legacyLink($activity, 'activities');
        }

        return $links;
    }

    /**
     * Ravi's list, and only Ravi has added to it, so he may delete it. Marked with a heart.
     *
     * @return array<string, array{id: int, title: string, type: string, slug: string}>
     */
    private function books(Household $h): array
    {
        $list = CornerList::factory()->create([
            'name' => 'Books', 'slug' => 'books', 'icon' => 'book-open',
            'done_label' => 'Read', 'todo_label' => 'To read', 'done_icon' => 'heart',
            'created_by_user_id' => $h->ravi->id, 'created_at' => $h->daysAgo(16),
        ]);

        // [title, notes, days ago added, read days ago]
        $books = [
            ['The Salt Road', 'Borrowed from Meera; give it back.', 14, null],
            ['A Year of Small Gardens', null, 15, 6],
            ['The River Children', null, 16, null],
        ];

        $links = [];
        foreach ($books as $i => [$title, $notes, $added, $readAgo]) {
            $book = Item::factory()->create([
                'list_id' => $list->id,
                'title' => $title,
                'notes' => $notes,
                'added_by_user_id' => $h->ravi->id,
                'added_at' => $h->daysAgo($added),
                ...$this->done($h, $readAgo === null ? null : $h->ravi, $readAgo),
            ]);

            $links[$i === 0 ? 'book' : "book-{$i}"] = $this->link($book, 'books');
        }

        return $links;
    }

    /**
     * Meera's list with a long name. Kabir has added to it, so Meera may change it but it
     * takes an admin to delete it. One place has coordinates, the other was only typed.
     *
     * @return array<string, array{id: int, title: string, type: string, slug: string}>
     */
    private function restaurants(Household $h): array
    {
        $list = CornerList::factory()->create([
            'name' => 'Restaurants we keep meaning to try on a slow Sunday',
            'slug' => 'restaurants-we-keep-meaning-to-try-on-a-slow-sunday',
            'icon' => 'utensils', 'done_label' => 'Eaten at', 'todo_label' => 'To try', 'done_icon' => 'check',
            'created_by_user_id' => $h->meera->id, 'created_at' => $h->daysAgo(10),
        ]);

        $malabar = Item::factory()->create([
            'list_id' => $list->id,
            'title' => 'Malabar Kitchen',
            'notes' => "Ask for the fish curry.\n\n3 Church Street, Bengaluru",
            ...$this->linkTo('https://www.google.com/maps/search/?api=1&query=12.9752,77.605'),
            'site_name' => 'Google Maps',
            'added_by_user_id' => $h->meera->id,
            'added_at' => $h->daysAgo(9),
            ...$this->done($h, $h->kabir, 2),
        ]);

        $dosa = Item::factory()->create([
            'list_id' => $list->id,
            'title' => 'The Dosa Window',
            'notes' => 'MG Road',
            'added_by_user_id' => $h->kabir->id,
            'added_at' => $h->daysAgo(8),
        ]);

        return [
            'restaurant' => $this->link($malabar, $list->slug),
            'restaurant-1' => $this->link($dosa, $list->slug),
        ];
    }

    /**
     * Kabir's list, still empty, with notifications off.
     *
     * @return array<string, array{id: int, title: string, type: string, slug: string}>
     */
    private function boardGames(Household $h): array
    {
        CornerList::factory()->create([
            'name' => 'Board games', 'slug' => 'board-games', 'icon' => 'dices',
            'done_label' => 'Played', 'todo_label' => 'To play', 'done_icon' => 'check',
            'notify_on_add' => false,
            'created_by_user_id' => $h->kabir->id, 'created_at' => $h->daysAgo(1),
        ]);

        return [];
    }

    /**
     * Meera's list of everything else an item can be: an ordinary site's link with the picture
     * its page offers, a link with no picture, a picture pasted on its own, a map link nobody
     * could read coordinates from, and one item with a link, a picture and a place together.
     * Its icon comes from the full set, not the first two dozen.
     *
     * @return array<string, array{id: int, title: string, type: string, slug: string}>
     */
    private function weekendIdeas(Household $h): array
    {
        $list = CornerList::factory()->create([
            'name' => 'Weekend ideas', 'slug' => 'weekend-ideas', 'icon' => 'sailboat',
            'done_label' => 'Tried', 'todo_label' => 'Some day', 'done_icon' => 'heart',
            'created_by_user_id' => $h->meera->id, 'created_at' => $h->daysAgo(6),
        ]);

        $items = [
            'idea' => [
                'title' => 'Stargazing on a clear night',
                ...$this->linkTo('https://www.timeanddate.com/astronomy/night/'),
                'site_name' => 'timeanddate.com',
                'image_url' => $this->picture('https://c.tadst.com/gfx/og/astronomy-night.jpg', 'Night sky', 600, 400),
                'added_by_user_id' => $h->admin->id,
                'added_at' => $h->daysAgo(5),
                ...$this->done($h, $h->ravi, 1),
            ],
            'idea-1' => [
                'title' => 'Film club at the library',
                'notes' => 'First Saturday of the month.',
                ...$this->linkTo('https://example.org/library/film-club'),
                'added_by_user_id' => $h->meera->id,
                'added_at' => $h->daysAgo(4),
            ],
            'idea-2' => [
                'title' => 'That picnic spot from the photo',
                'image_url' => $this->picture('https://images.example.net/picnic-spot.jpg', 'Picnic', 600, 400),
                'added_by_user_id' => $h->kabir->id,
                'added_at' => $h->daysAgo(3),
            ],
            'idea-3' => [
                'title' => 'Sunday farmers market',
                ...$this->linkTo('https://maps.app.goo.gl/devFarmersMarket'),
                'added_by_user_id' => $h->kabir->id,
                'added_at' => $h->daysAgo(3),
                ...$this->done($h, $h->meera, 1),
            ],
            'idea-4' => [
                'title' => 'Pottery cafe in Indiranagar',
                // A website with a separate pin, as the upgrade leaves it: the pin is in the notes.
                'notes' => "They keep your bowl for a week while it dries.\n\n"
                    ."https://www.google.com/maps/place/Clay+Studio/@12.9719,77.6412,17z\nClay Studio, Indiranagar\n100 Feet Road, Indiranagar, Bengaluru",
                ...$this->linkTo('https://www.lonelyplanet.com/india/karnataka/bengaluru'),
                'site_name' => 'Lonely Planet',
                'author' => 'Lonely Planet',
                'image_url' => $this->picture('https://lp-cms-production.imgix.net/bengaluru-og.jpg', 'Bengaluru', 600, 400),
                'added_by_user_id' => $h->ravi->id,
                'added_at' => $h->daysAgo(2),
            ],
        ];

        $links = [];
        foreach ($items as $key => $attributes) {
            $links[$key] = $this->link(Item::factory()->create(['list_id' => $list->id, ...$attributes]), $list->slug);
        }

        return $links;
    }

    /** @return array{url: string, url_key: ?string, site_name: ?string} */
    private function linkTo(string $url): array
    {
        return LinkKey::columnsFor($url);
    }

    /** A picture's web address, its bytes already in the picture cache. */
    private function picture(string $url, string $label, int $width, int $height): string
    {
        app(PictureCache::class)->put($url, PlaceholderImage::jpeg($label, $this->pictureSeed++, $width, $height), 'image/jpeg');

        return $url;
    }

    /** @return array{legacy_type: string, legacy_id: int} */
    private function legacy(string $type): array
    {
        $this->legacyIds[$type] = ($this->legacyIds[$type] ?? 0) + 1;

        return ['legacy_type' => $type, 'legacy_id' => $this->legacyIds[$type]];
    }

    /**
     * @return array{done_at: mixed, done_by_user_id: int|null}
     */
    private function done(Household $h, ?User $by, ?int $daysAgo): array
    {
        return [
            'done_at' => $by === null ? null : $h->daysAgo((int) $daysAgo),
            'done_by_user_id' => $by?->id,
        ];
    }

    /**
     * A link written before lists were customisable: the old type and the old id.
     *
     * @return array{id: int, title: string, type: string, slug: string}
     */
    private function legacyLink(Item $item, string $slug): array
    {
        return ['id' => (int) $item->legacy_id, 'title' => $item->title, 'type' => (string) $item->legacy_type, 'slug' => $slug];
    }

    /**
     * @return array{id: int, title: string, type: string, slug: string}
     */
    private function link(Item $item, string $slug): array
    {
        return ['id' => $item->id, 'title' => $item->title, 'type' => 'corner.item', 'slug' => $slug];
    }
}
