<?php

use App\MiniApps\Corner\Models\Activity;
use App\MiniApps\Corner\Models\Movie;
use App\MiniApps\Corner\Models\Place;
use App\MiniApps\Corner\Models\Song;

return [
    'songs' => [
        'slug' => 'songs',
        'push_on_add' => true,
        'model' => Song::class,
        'entity_type' => 'corner.song',
    ],

    'movies' => [
        'slug' => 'movies',
        'push_on_add' => true,
        'model' => Movie::class,
        'entity_type' => 'corner.movie',
    ],

    'activities' => [
        'slug' => 'activities',
        'push_on_add' => true,
        'model' => Activity::class,
        'entity_type' => 'corner.activity',
    ],

    'places' => [
        'slug' => 'places',
        'push_on_add' => true,
        'model' => Place::class,
        'entity_type' => 'corner.place',
    ],
];
