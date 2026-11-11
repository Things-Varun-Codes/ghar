<?php

namespace Database\Seeders\DevData;

use App\MiniApps\Corner\Models\Activity;
use App\MiniApps\Corner\Models\Movie;
use App\MiniApps\Corner\Models\Place;
use App\MiniApps\Corner\Models\Song;
use App\Shell\Models\User;

/**
 * Corner lists: named items with mixed adders and done states, plus enough
 * filler songs to run past the 50-row page.
 */
final class CornerData
{
    private const FILLER_SONGS = 54;

    /**
     * @return array<string, array{id: int, title: string, type: string, slug: string}> what moments can link to
     */
    public function seed(Household $h): array
    {
        return [
            ...$this->songs($h),
            ...$this->movies($h),
            ...$this->places($h),
            ...$this->activities($h),
        ];
    }

    /**
     * @return array<string, array{id: int, title: string, type: string, slug: string}>
     */
    private function songs(Household $h): array
    {
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

        foreach ($named as $i => [$title, $author, $adder, $added, $lovedBy, $lovedAgo]) {
            $song = $this->song($h, $i, $title, $author, $adder, $added, $lovedBy, $lovedAgo, withThumbnail: true);
            $links[$i === 0 ? 'song' : "song-{$i}"] = $this->link($song->id, $title, 'corner.song', 'songs');
        }

        // Older than the named ones, so the first page reads naturally.
        for ($i = 0; $i < self::FILLER_SONGS; $i++) {
            $adder = $h->members()[$i % 4];
            $lovedBy = $i % 5 === 0 ? $h->members()[($i + 1) % 4] : null;

            $this->song(
                $h,
                count($named) + $i,
                rtrim($h->faker->sentence(3), '.'),
                $h->faker->name(),
                $adder,
                50 + $i * 3,
                $lovedBy,
                $lovedBy ? 45 + $i * 3 : null,
                withThumbnail: false,
            );
        }

        return $links;
    }

    private function song(
        Household $h,
        int $index,
        string $title,
        string $author,
        User $adder,
        int $addedDaysAgo,
        ?User $lovedBy,
        ?int $lovedDaysAgo,
        bool $withThumbnail,
    ): Song {
        $spotify = $index % 3 === 2;
        $providerId = substr(hash('sha256', "dev-song-{$index}"), 0, $spotify ? 22 : 11);

        return Song::factory()->create([
            'provider' => $spotify ? 'spotify' : 'youtube',
            'provider_id' => $providerId,
            'url' => $spotify
                ? "https://open.spotify.com/track/{$providerId}"
                : "https://www.youtube.com/watch?v={$providerId}",
            'title' => $title,
            'author' => $author,
            'thumbnail_url' => $withThumbnail
                ? '/storage/'.$h->storeImage("song-{$index}.jpg", PlaceholderImage::jpeg($title, $index, 320, 320))
                : null,
            'added_by_user_id' => $adder->id,
            'added_at' => $h->daysAgo($addedDaysAgo),
            ...$this->done($h, $lovedBy, $lovedDaysAgo),
        ]);
    }

    /**
     * @return array<string, array{id: int, title: string, type: string, slug: string}>
     */
    private function movies(Household $h): array
    {
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

        foreach ($movies as $i => [$title, $adder, $added, $watchedBy, $watchedAgo, $hasPoster]) {
            $movie = Movie::factory()->create([
                'title' => $title,
                'poster_url' => $hasPoster
                    ? '/storage/'.$h->storeImage("movie-{$i}.jpg", PlaceholderImage::jpeg($title, $i + 2, 400, 600))
                    : null,
                'added_by_user_id' => $adder->id,
                'added_at' => $h->daysAgo($added),
                ...$this->done($h, $watchedBy, $watchedAgo),
            ]);

            $links[$i === 0 ? 'movie' : "movie-{$i}"] = $this->link($movie->id, $title, 'corner.movie', 'movies');
        }

        return $links;
    }

    /**
     * @return array<string, array{id: int, title: string, type: string, slug: string}>
     */
    private function places(Household $h): array
    {
        // [title, address, lat, lng, adder, days ago added, visited by, visited days ago]
        $places = [
            ['Blue Door Cafe', '12 Fort Road, Kochi', 9.9658, 76.2421, $h->meera, 5, null, null],
            ['Hilltop Tea Estate', 'Estate Road, Munnar', 10.0889, 77.0595, $h->admin, 18, $h->ravi, 7],
            ['The Old Lighthouse', 'Beach Road, Alappuzha', 9.4981, 76.3388, $h->ravi, 26, null, null],
            ['Stepwell Museum', 'Heritage Lane, Ahmedabad', 23.0225, 72.5714, $h->kabir, 38, $h->admin, 31],
            ['Grandma\'s Bakery', '4 Market Street, Mysuru', 12.2958, 76.6394, $h->admin, 47, $h->meera, 42],
            ['River Rafting Camp', 'Camp Road, Rishikesh', 30.0869, 78.2676, $h->kabir, 60, null, null],
        ];

        foreach ($places as $i => [$title, $address, $lat, $lng, $adder, $added, $visitedBy, $visitedAgo]) {
            $place = Place::factory()->create([
                'title' => $title,
                'place_id' => 'dev-place-'.$i,
                'lat' => $lat,
                'lng' => $lng,
                'address' => $address,
                'added_by_user_id' => $adder->id,
                'added_at' => $h->daysAgo($added),
                ...$this->done($h, $visitedBy, $visitedAgo),
            ]);

            $links[$i === 0 ? 'place' : "place-{$i}"] = $this->link($place->id, $title, 'corner.place', 'places');
        }

        return $links;
    }

    /**
     * @return array<string, array{id: int, title: string, type: string, slug: string}>
     */
    private function activities(Household $h): array
    {
        // [title, notes, adder, days ago added, done by, done days ago]
        $activities = [
            ['Teach Kabir to make dal', 'Start with the pressure cooker.', $h->meera, 2, null, null],
            ['Board game night', null, $h->kabir, 7, $h->admin, 1],
            ['Clear out the loft', 'Keep the old photo albums.', $h->admin, 11, null, null],
            ['Plant the balcony herbs', null, $h->ravi, 19, $h->meera, 12],
            ['Learn one card trick each', null, $h->kabir, 30, null, null],
            ['Cycle to the lake', 'Early, before it gets hot.', $h->ravi, 41, $h->kabir, 36],
        ];

        foreach ($activities as $i => [$title, $notes, $adder, $added, $doneBy, $doneAgo]) {
            $activity = Activity::factory()->create([
                'title' => $title,
                'notes' => $notes,
                'added_by_user_id' => $adder->id,
                'added_at' => $h->daysAgo($added),
                ...$this->done($h, $doneBy, $doneAgo),
            ]);

            $links[$i === 0 ? 'activity' : "activity-{$i}"] = $this->link($activity->id, $title, 'corner.activity', 'activities');
        }

        return $links;
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
     * @return array{id: int, title: string, type: string, slug: string}
     */
    private function link(int $id, string $title, string $type, string $slug): array
    {
        return ['id' => $id, 'title' => $title, 'type' => $type, 'slug' => $slug];
    }
}
