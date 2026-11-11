<?php

namespace App\MiniApps\Corner\Actions;

use App\MiniApps\Corner\Models\Place;
use App\Shell\Models\User;
use App\Shell\Services\PushDispatcher;
use Illuminate\Support\Facades\DB;

class AddPlace
{
    public function __construct(
        private readonly PushDispatcher $dispatcher,
    ) {}

    /**
     * @param  array{title: string, place_id?: string|null, lat?: float|string|null, lng?: float|string|null, address?: string|null}  $data
     */
    public function __invoke(array $data, User $adder): Place
    {
        return DB::transaction(function () use ($data, $adder): Place {
            $place = Place::create([
                'title' => $data['title'],
                'place_id' => $data['place_id'] ?? null,
                'lat' => $data['lat'] ?? null,
                'lng' => $data['lng'] ?? null,
                'address' => $data['address'] ?? null,
                'added_by_user_id' => $adder->id,
                'added_at' => now(),
            ]);

            // Inside afterCommit so a rolled-back row is never pushed.
            if (config('corner-lists.places.push_on_add', true)) {
                $firstName = $adder->firstName();
                $body = "{$firstName} added a place: {$place->title}";

                DB::afterCommit(function () use ($adder, $body): void {
                    $this->dispatcher->toHousehold(
                        $adder,
                        'our-corner',
                        'our-corner:places',
                        $body,
                        '/apps/our-corner/places',
                    );
                });
            }

            return $place;
        });
    }
}
