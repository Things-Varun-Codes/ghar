<?php

namespace Database\Factories;

use App\MiniApps\Corner\Models\CornerList;
use App\MiniApps\Corner\Models\Item;
use App\Shell\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * A plain item by default. The link, poster and place states fill the columns those kinds
 * use; pair them with a list of the same kind.
 *
 * @extends Factory<Item>
 */
class ItemFactory extends Factory
{
    protected $model = Item::class;

    public function definition(): array
    {
        return [
            'list_id' => CornerList::factory(),
            'title' => fake()->sentence(3),
            'notes' => null,
            'added_by_user_id' => User::factory(),
            'added_at' => now(),
            'done_at' => null,
            'done_by_user_id' => null,
        ];
    }

    public function link(): static
    {
        return $this->state(function () {
            $providerId = fake()->regexify('[A-Za-z0-9_-]{11}');

            return [
                'provider' => 'youtube',
                'provider_id' => $providerId,
                'url' => "https://www.youtube.com/watch?v={$providerId}",
                'author' => fake()->name(),
                'image_url' => "https://i.ytimg.com/vi/{$providerId}/hqdefault.jpg",
            ];
        });
    }

    public function poster(): static
    {
        return $this->state(fn () => [
            'image_url' => 'https://image.tmdb.org/t/p/w500/'.fake()->bothify('????????').'.jpg',
        ]);
    }

    public function place(): static
    {
        return $this->state(fn () => [
            'title' => fake()->company(),
            'place_id' => 'ChIJ'.fake()->bothify('????##########'),
            'lat' => fake()->latitude(),
            'lng' => fake()->longitude(),
            'address' => fake()->address(),
        ]);
    }

    public function done(User $by): static
    {
        return $this->state(fn () => [
            'done_at' => now(),
            'done_by_user_id' => $by->id,
        ]);
    }
}
