<?php

namespace Database\Factories;

use App\MiniApps\Corner\Models\Place;
use App\Shell\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Place> */
class PlaceFactory extends Factory
{
    protected $model = Place::class;

    public function definition(): array
    {
        return [
            'title' => fake()->company(),
            'place_id' => 'ChIJ'.fake()->bothify('????##########'),
            'lat' => fake()->latitude(),
            'lng' => fake()->longitude(),
            'address' => fake()->address(),
            'added_by_user_id' => User::factory(),
            'added_at' => now(),
            'done_at' => null,
            'done_by_user_id' => null,
        ];
    }

    public function visited(User $by): static
    {
        return $this->state(fn () => [
            'done_at' => now(),
            'done_by_user_id' => $by->id,
        ]);
    }
}
