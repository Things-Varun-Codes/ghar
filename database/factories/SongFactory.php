<?php

namespace Database\Factories;

use App\MiniApps\Corner\Models\Song;
use App\Shell\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Song> */
class SongFactory extends Factory
{
    protected $model = Song::class;

    public function definition(): array
    {
        $providerId = fake()->regexify('[A-Za-z0-9_-]{11}');

        return [
            'provider' => 'youtube',
            'provider_id' => $providerId,
            'url' => "https://www.youtube.com/watch?v={$providerId}",
            'title' => fake()->sentence(3),
            'author' => fake()->name(),
            'thumbnail_url' => "https://i.ytimg.com/vi/{$providerId}/hqdefault.jpg",
            'added_by_user_id' => User::factory(),
            'added_at' => now(),
            'done_at' => null,
            'done_by_user_id' => null,
        ];
    }

    public function spotify(): static
    {
        return $this->state(function () {
            $providerId = fake()->regexify('[A-Za-z0-9]{22}');

            return [
                'provider' => 'spotify',
                'provider_id' => $providerId,
                'url' => "https://open.spotify.com/track/{$providerId}",
                'author' => null,
                'thumbnail_url' => "https://i.scdn.co/image/{$providerId}",
            ];
        });
    }

    public function loved(User $by): static
    {
        return $this->state(fn () => [
            'done_at' => now(),
            'done_by_user_id' => $by->id,
        ]);
    }
}
