<?php

namespace Database\Factories;

use App\MiniApps\History\Models\Event;
use App\Shell\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Event> */
class EventFactory extends Factory
{
    /** @var class-string<Event> */
    protected $model = Event::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'occurred_on' => fake()->dateTimeBetween('-5 years', 'now')->format('Y-m-d'),
            'title' => fake()->optional(0.8)->sentence(4),
            'location_freetext' => fake()->optional(0.6)->city(),
            'location_place_id' => null,
            'location_name' => null,
            'location_address' => null,
            'location_lat' => null,
            'location_lng' => null,
            'body_html' => null,
            'creator_id' => User::factory(),
        ];
    }

    public function withBody(): static
    {
        return $this->state(fn (array $attributes) => [
            'body_html' => '<h2>A moment</h2><p>This is a <em>sample</em> body with <strong>bold</strong> text.</p>',
        ]);
    }

    public function withoutBody(): static
    {
        return $this->state(fn (array $attributes) => [
            'body_html' => null,
        ]);
    }

    public function deleted(): static
    {
        return $this->state(fn (array $attributes) => [
            'deleted_at' => now()->subDay(),
        ]);
    }
}
