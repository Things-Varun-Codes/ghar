<?php

namespace Database\Factories;

use App\MiniApps\Corner\Models\CornerList;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<CornerList> */
class CornerListFactory extends Factory
{
    protected $model = CornerList::class;

    public function definition(): array
    {
        $name = ucfirst(fake()->unique()->words(2, true));

        return [
            'name' => $name,
            'slug' => str($name)->slug()->append('-'.fake()->unique()->numberBetween(1, 999999))->toString(),
            'icon' => 'bookmark',
            'done_label' => 'Done',
            'todo_label' => 'To do',
            'done_icon' => 'check',
            'notify_on_add' => true,
            'position' => 0,
            'created_by_user_id' => null,
        ];
    }

    public function songs(): static
    {
        return $this->state(fn () => [
            'name' => 'Songs', 'slug' => 'songs', 'icon' => 'music',
            'done_label' => 'Loved', 'todo_label' => 'Playlist', 'done_icon' => 'heart',
        ]);
    }

    public function movies(): static
    {
        return $this->state(fn () => [
            'name' => 'Movies', 'slug' => 'movies', 'icon' => 'film',
            'done_label' => 'Watched', 'todo_label' => 'To watch',
        ]);
    }

    public function activities(): static
    {
        return $this->state(fn () => [
            'name' => 'Activities', 'slug' => 'activities', 'icon' => 'compass',
        ]);
    }

    public function places(): static
    {
        return $this->state(fn () => [
            'name' => 'Places', 'slug' => 'places', 'icon' => 'map-pin',
            'done_label' => 'Visited', 'todo_label' => 'Wishlist',
        ]);
    }
}
