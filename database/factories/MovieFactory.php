<?php

namespace Database\Factories;

use App\MiniApps\Corner\Models\Movie;
use App\Shell\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Movie> */
class MovieFactory extends Factory
{
    protected $model = Movie::class;

    public function definition(): array
    {
        return [
            'title' => fake()->sentence(3),
            'poster_url' => null,
            'plex_url' => null,
            'added_by_user_id' => User::factory(),
            'added_at' => now(),
            'done_at' => null,
            'done_by_user_id' => null,
        ];
    }

    public function watched(User $by): static
    {
        return $this->state(fn () => [
            'done_at' => now(),
            'done_by_user_id' => $by->id,
        ]);
    }

    public function withPlex(): static
    {
        return $this->state(fn () => [
            'plex_url' => 'https://watch.plex.tv/movie/the-man-from-earth',
            'poster_url' => 'https://images.plex.tv/photo?size=large-1280&url=abc',
        ]);
    }
}
