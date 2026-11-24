<?php

namespace Database\Factories;

use App\MiniApps\Corner\Models\CornerList;
use App\MiniApps\Corner\Models\Item;
use App\MiniApps\Corner\Support\LinkKey;
use App\Shell\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * A name and nothing else, unless one of the states adds a link, a picture or a place.
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

    public function link(?string $url = null): static
    {
        return $this->state(function () use ($url) {
            $url ??= 'https://example.com/'.fake()->unique()->slug(3);

            return LinkKey::columnsFor($url) + ['author' => fake()->name()];
        });
    }

    public function picture(?string $url = null): static
    {
        return $this->state(fn () => [
            'image_url' => $url ?? 'https://images.example.com/'.fake()->unique()->bothify('????????').'.jpg',
        ]);
    }

    public function place(): static
    {
        return $this->state(fn () => [
            'url' => $url = 'https://maps.example.com/maps/place/'.urlencode(fake()->company()).'/@'.fake()->latitude().','.fake()->longitude().',17z',
            'url_key' => LinkKey::for($url),
            'site_name' => LinkKey::siteOf($url),
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
